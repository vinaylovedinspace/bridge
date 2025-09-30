'use server';

import { DEFAULT_WORKING_DAYS } from '@/lib/constants/business';
import { db } from '@/db';
import { BranchTable, SessionTable } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { branchSettingsSchema, type BranchSettings } from '../types';

async function updateScheduledSessionsForWorkingDays(branchId: string, newWorkingDays: number[]) {
  try {
    console.log('Updating sessions for working days:', newWorkingDays);

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Find all future scheduled sessions for this branch
    const futureScheduledSessions = await db
      .select()
      .from(SessionTable)
      .where(
        and(
          eq(SessionTable.branchId, branchId),
          eq(SessionTable.status, 'SCHEDULED'),
          gte(SessionTable.sessionDate, todayStr)
        )
      );

    console.log(`Found ${futureScheduledSessions.length} future scheduled sessions`);

    if (futureScheduledSessions.length === 0) {
      return { updated: 0 };
    }

    // Filter sessions that fall on non-working days (timezone-safe)
    const sessionsToReschedule = futureScheduledSessions.filter((session) => {
      // Parse date string safely without timezone issues
      const [year, month, day] = session.sessionDate.split('-').map(Number);
      const sessionDate = new Date(year, month - 1, day); // month is 0-indexed in JS
      const dayOfWeek = sessionDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const needsRescheduling = !newWorkingDays.includes(dayOfWeek);

      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      console.log(
        `Session ${session.id} on ${session.sessionDate} (${dayNames[dayOfWeek]}, day ${dayOfWeek}) - Working days: [${newWorkingDays}] - Needs rescheduling: ${needsRescheduling}`
      );

      return needsRescheduling;
    });

    if (sessionsToReschedule.length === 0) {
      console.log('No sessions need rescheduling');
      return { updated: 0 };
    }

    console.log(`Found ${sessionsToReschedule.length} sessions that need rescheduling`);

    // Sort sessions by date to reschedule in chronological order
    sessionsToReschedule.sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));

    // Find the latest session date among all existing sessions to reschedule after it
    const allSessionDates = futureScheduledSessions.map((s) => s.sessionDate).sort();
    const latestSessionDate = allSessionDates[allSessionDates.length - 1];

    console.log(`Latest existing session date: ${latestSessionDate}`);

    // Helper function to find next available working day after a given date
    function findNextAvailableWorkingDay(
      afterDateString: string,
      workingDays: number[],
      existingSessionDates: Set<string>
    ): string {
      // Parse date string safely without timezone issues
      const [year, month, day] = afterDateString.split('-').map(Number);
      const currentDate = new Date(year, month - 1, day); // month is 0-indexed in JS

      let attempts = 0;

      while (attempts < 30) {
        // Look ahead max 30 days
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        const dayOfWeek = currentDate.getDay();

        // Format as YYYY-MM-DD without timezone conversion
        const nextYear = currentDate.getFullYear();
        const nextMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
        const nextDay = String(currentDate.getDate()).padStart(2, '0');
        const candidateDate = `${nextYear}-${nextMonth}-${nextDay}`;

        // Check if this is a working day and not already occupied
        if (workingDays.includes(dayOfWeek) && !existingSessionDates.has(candidateDate)) {
          return candidateDate;
        }
        attempts++;
      }

      // Fallback to first working day of next week if no working day found
      currentDate.setDate(currentDate.getDate() + 7);
      const firstWorkingDay = Math.min(...workingDays);
      const daysToAdd = (firstWorkingDay - currentDate.getDay() + 7) % 7;
      currentDate.setDate(currentDate.getDate() + daysToAdd);

      const fallbackYear = currentDate.getFullYear();
      const fallbackMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
      const fallbackDay = String(currentDate.getDate()).padStart(2, '0');
      return `${fallbackYear}-${fallbackMonth}-${fallbackDay}`;
    }

    // Keep track of newly assigned dates to avoid conflicts
    const usedDates = new Set(futureScheduledSessions.map((s) => s.sessionDate));
    let startFromDate = latestSessionDate;

    // Reschedule sessions sequentially after the latest existing session
    for (const session of sessionsToReschedule) {
      const newSessionDate = findNextAvailableWorkingDay(startFromDate, newWorkingDays, usedDates);

      console.log(
        `Rescheduling session ${session.id} from ${session.sessionDate} to ${newSessionDate}`
      );

      const updateResult = await db
        .update(SessionTable)
        .set({
          sessionDate: newSessionDate,
          status: 'RESCHEDULED',
          originalSessionId: session.id, // Track original session
          updatedAt: new Date(),
        })
        .where(eq(SessionTable.id, session.id))
        .returning({
          id: SessionTable.id,
          sessionDate: SessionTable.sessionDate,
          status: SessionTable.status,
        });

      console.log(`Database update result for session ${session.id}:`, updateResult);

      // Add the new date to used dates and update start point for next session
      usedDates.add(newSessionDate);
      startFromDate = newSessionDate;
    }

    console.log(`Rescheduled ${sessionsToReschedule.length} sessions due to working days change`);

    return { updated: sessionsToReschedule.length };
  } catch (error) {
    console.error('Error updating sessions for working days change:', error);
    throw error;
  }
}

export async function updateBranchSettings(branchId: string, settings: BranchSettings) {
  try {
    // Validate the settings
    const validatedSettings = branchSettingsSchema.parse(settings);

    // Get current branch settings to compare working days
    const currentBranch = await db
      .select({
        workingDays: BranchTable.workingDays,
      })
      .from(BranchTable)
      .where(eq(BranchTable.id, branchId))
      .limit(1);

    if (!currentBranch[0]) {
      throw new Error('Branch not found');
    }

    const currentWorkingDays = currentBranch[0].workingDays || DEFAULT_WORKING_DAYS;
    const newWorkingDays = validatedSettings.workingDays;

    // Check if working days have changed
    const workingDaysChanged =
      JSON.stringify(currentWorkingDays.sort()) !== JSON.stringify(newWorkingDays.sort());

    // Update the branch settings
    await db
      .update(BranchTable)
      .set({
        workingDays: validatedSettings.workingDays,
        operatingHours: validatedSettings.operatingHours,
        defaultRtoOffice: validatedSettings.defaultRtoOffice || null,
        licenseServiceCharge: validatedSettings.licenseServiceCharge || 500,
        updatedAt: new Date(),
      })
      .where(eq(BranchTable.id, branchId));

    let sessionUpdateResult = { updated: 0 };

    // If working days changed, update scheduled sessions
    if (workingDaysChanged) {
      try {
        sessionUpdateResult = await updateScheduledSessionsForWorkingDays(branchId, newWorkingDays);
        console.log('Scheduled sessions updated successfully:', sessionUpdateResult);
      } catch (error) {
        console.error('Error updating sessions, but branch settings were saved:', error);
        // Don't fail the entire operation if session updates fail
      }
    }

    const message =
      sessionUpdateResult.updated > 0
        ? `Branch settings updated successfully. ${sessionUpdateResult.updated} future scheduled sessions were rescheduled to working days.`
        : 'Branch settings updated successfully';

    return {
      success: true,
      message,
      sessionsUpdated: sessionUpdateResult.updated,
    };
  } catch (error) {
    console.error('Error updating branch settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update branch settings',
    };
  }
}

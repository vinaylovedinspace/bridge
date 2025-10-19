//NOTE: NOT WORKING

import { db } from '@/db';
import { SessionTable } from '@/db/schema';
import { eq, and, gte, lte, isNull } from 'drizzle-orm';
import { sendSessionReminder } from './session-reminder-service';

export interface SessionSchedulerOptions {
  reminderHours?: number; // Hours before session to send reminder (default: 24)
  batchSize?: number; // Number of sessions to process at once (default: 50)
}

interface SessionWithRelations {
  id: string;
  sessionDate: string;
  startTime: string;
  sessionNumber: number | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  } | null;
  vehicle: {
    name: string;
    number: string;
  } | null;
}

const DEFAULT_REMINDER_HOURS = 24;
const DEFAULT_BATCH_SIZE = 50;

export async function sendUpcomingSessionReminders(options: SessionSchedulerOptions = {}): Promise<{
  success: boolean;
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const reminderHours = options.reminderHours || DEFAULT_REMINDER_HOURS;
  const batchSize = options.batchSize || DEFAULT_BATCH_SIZE;

  console.log(`📅 [Scheduler] Starting reminder process for sessions in ${reminderHours} hours`);

  try {
    // Calculate time window for reminders
    const now = new Date();
    const reminderTime = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);
    const windowStart = new Date(reminderTime.getTime() - 30 * 60 * 1000); // 30 min before
    const windowEnd = new Date(reminderTime.getTime() + 30 * 60 * 1000); // 30 min after

    console.log(
      `📅 [Scheduler] Looking for sessions between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`
    );

    // Get sessions that need reminders
    const sessions = await getSessionsForReminders(windowStart, windowEnd, batchSize);

    console.log(`📅 [Scheduler] Found ${sessions.length} sessions to process`);

    if (sessions.length === 0) {
      return {
        success: true,
        processed: 0,
        sent: 0,
        failed: 0,
        errors: [],
      };
    }

    // Send reminders
    const results = await sendRemindersForSessions(sessions);

    console.log(`📅 [Scheduler] Completed: ${results.sent} sent, ${results.failed} failed`);

    return {
      success: true,
      processed: sessions.length,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors,
    };
  } catch (error) {
    console.error('❌ [Scheduler] Error in reminder process:', error);
    return {
      success: false,
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Send reminder for a specific session
 */
export async function sendSingleSessionReminder(sessionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log(`📅 [Scheduler] Sending reminder for session: ${sessionId}`);

  try {
    // Get session details
    const session = await db.query.SessionTable.findFirst({
      where: and(eq(SessionTable.id, sessionId), isNull(SessionTable.deletedAt)),
      with: {
        client: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        vehicle: {
          columns: {
            name: true,
            number: true,
          },
        },
      },
    });

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (session.status === 'CANCELLED') {
      return { success: false, error: 'Session is cancelled' };
    }

    if (!session.client?.phoneNumber) {
      return { success: false, error: 'Client phone number not available' };
    }

    // Send reminder
    const result = await sendSessionReminder(
      {
        id: session.client.id,
        firstName: session.client.firstName,
        lastName: session.client.lastName,
        phoneNumber: session.client.phoneNumber,
      },
      {
        sessionId: session.id,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        sessionNumber: session.sessionNumber || undefined,
        instructorName: undefined,
        vehicleDetails: session.vehicle
          ? {
              name: session.vehicle.name,
              number: session.vehicle.number,
            }
          : undefined,
      }
    );

    if (result.success) {
      console.log(`✅ [Scheduler] Reminder sent for session: ${sessionId}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ [Scheduler] Error sending reminder for session ${sessionId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get sessions that need reminders
 */
async function getSessionsForReminders(windowStart: Date, windowEnd: Date, limit: number) {
  const startDateStr = windowStart.toISOString().split('T')[0];
  const endDateStr = windowEnd.toISOString().split('T')[0];

  return await db.query.SessionTable.findMany({
    where: and(
      // Session is not deleted
      isNull(SessionTable.deletedAt),
      // Session is not cancelled
      eq(SessionTable.status, 'SCHEDULED'),
      // Add additional filters here if needed
      // Session is within the time window
      gte(SessionTable.sessionDate, startDateStr),
      lte(SessionTable.sessionDate, endDateStr)
    ),
    with: {
      client: {
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
        },
      },
      vehicle: {
        columns: {
          name: true,
          number: true,
        },
      },
    },
    limit,
    orderBy: (sessions, { asc }) => [asc(sessions.sessionDate), asc(sessions.startTime)],
  });
}

/**
 * Send reminders for multiple sessions
 */
async function sendRemindersForSessions(sessions: SessionWithRelations[]) {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const session of sessions) {
    try {
      if (!session.client?.phoneNumber) {
        failed++;
        errors.push(`Session ${session.id}: No phone number`);
        continue;
      }

      const result = await sendSessionReminder(
        {
          id: session.client.id,
          firstName: session.client.firstName,
          lastName: session.client.lastName,
          phoneNumber: session.client.phoneNumber,
        },
        {
          sessionId: session.id,
          sessionDate: session.sessionDate,
          startTime: session.startTime,
          sessionNumber: session.sessionNumber || undefined,
          instructorName: undefined,
          vehicleDetails: session.vehicle
            ? {
                name: session.vehicle.name,
                number: session.vehicle.number,
              }
            : undefined,
        }
      );

      if (result.success) {
        sent++;
        console.log(`✅ [Scheduler] Reminder sent for session: ${session.id}`);
      } else {
        failed++;
        errors.push(`Session ${session.id}: ${result.error}`);
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      failed++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Session ${session.id}: ${errorMsg}`);
      console.error(`❌ [Scheduler] Error processing session ${session.id}:`, error);
    }
  }

  return { sent, failed, errors };
}

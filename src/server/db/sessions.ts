import { db } from '@/db';
import { SessionTable } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, and, ne } from 'drizzle-orm';
import { getBranchConfig } from '@/server/action/branch';
import { triggerSessionWorkflow } from '@/lib/upstash/trigger-session-workflow';

const _getSessions = async (branchId: string, vehicleId?: string, clientId?: string) => {
  const conditions = [
    eq(SessionTable.branchId, branchId),
    // Exclude only cancelled sessions from calendar view (include rescheduled sessions)
    ne(SessionTable.status, 'CANCELLED'),
  ];

  if (vehicleId) {
    conditions.push(eq(SessionTable.vehicleId, vehicleId));
  }

  if (clientId) {
    conditions.push(eq(SessionTable.clientId, clientId));
  }

  const sessions = await db.query.SessionTable.findMany({
    where: and(...conditions),
    with: {
      client: {
        columns: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [SessionTable.sessionDate, SessionTable.startTime],
  });

  const result = sessions.map((session) => ({
    ...session,
    clientName: `${session.client?.firstName} ${session.client?.lastName}`,
  }));

  console.log(`Found ${result.length} sessions for vehicle ${vehicleId || 'all'}`);
  return result;
};

export const getSessions = async (vehicleId?: string, clientId?: string) => {
  const { id: branchId } = await getBranchConfig();

  return await _getSessions(branchId, vehicleId, clientId);
};

export const createSessions = async (
  sessions: Array<{
    clientId: string;
    vehicleId: string;
    planId: string;
    sessionDate: string; // YYYY-MM-DD string
    startTime: string;
    endTime: string;
    status: 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
    sessionNumber: number;
  }>
) => {
  const { userId } = await auth();
  const { id: branchId } = await getBranchConfig();

  const sessionsWithMetadata = sessions.map((session) => ({
    ...session,
    branchId,
    createdBy: userId!,
  }));

  const createdSessions = await db.insert(SessionTable).values(sessionsWithMetadata).returning();

  // Trigger workflows for SCHEDULED sessions only (fire and forget)
  createdSessions
    .filter((session) => session.status === 'SCHEDULED')
    .forEach((session) => {
      triggerSessionWorkflow({
        sessionId: session.id,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
      });
    });

  return createdSessions;
};

export const updateSession = async (
  sessionId: string,
  updates: {
    startTime?: string;
    endTime?: string;
    status?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'RESCHEDULED';
  }
) => {
  const { id: branchId } = await getBranchConfig();

  const updatedSession = await db
    .update(SessionTable)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(and(eq(SessionTable.id, sessionId), eq(SessionTable.branchId, branchId)))
    .returning();

  return updatedSession[0];
};

export const cancelSession = async (sessionId: string) => {
  const { id: branchId } = await getBranchConfig();

  const cancelledSession = await db
    .update(SessionTable)
    .set({
      status: 'CANCELLED',
      updatedAt: new Date(),
    })
    .where(and(eq(SessionTable.id, sessionId), eq(SessionTable.branchId, branchId)))
    .returning();

  return cancelledSession[0];
};

export const assignSessionToSlot = async (
  clientId: string,
  vehicleId: string,
  sessionDate: string, // YYYY-MM-DD string
  startTime: string,
  endTime: string
) => {
  const { id: branchId } = await getBranchConfig();

  // Find a cancelled session for this client
  const cancelledSession = await db.query.SessionTable.findFirst({
    where: and(
      eq(SessionTable.clientId, clientId),
      eq(SessionTable.branchId, branchId),
      eq(SessionTable.status, 'CANCELLED')
    ),
  });

  if (!cancelledSession) {
    throw new Error('No unassigned session found for this client');
  }

  // Update the cancelled session to be scheduled with new details
  const assignedSession = await db
    .update(SessionTable)
    .set({
      vehicleId,
      sessionDate,
      startTime,
      endTime,
      status: 'SCHEDULED',
      updatedAt: new Date(),
    })
    .where(eq(SessionTable.id, cancelledSession.id))
    .returning();

  const session = assignedSession[0];

  // Trigger workflow for newly scheduled session
  triggerSessionWorkflow({
    sessionId: session.id,
    sessionDate: session.sessionDate,
    startTime: session.startTime,
    endTime: session.endTime,
  });

  return session;
};

export const getSessionsByClientId = async (clientId: string) => {
  const { id: branchId } = await getBranchConfig();

  return await _getSessions(branchId, undefined, clientId);
};

export const updateScheduledSessionsForClient = async (
  clientId: string,
  newSessions: Array<{
    sessionDate: string; // YYYY-MM-DD string format
    startTime: string;
    endTime: string;
    vehicleId: string;
    planId: string;
    sessionNumber: number;
  }>
) => {
  const { userId } = await auth();
  const { id: branchId } = await getBranchConfig();

  // Get ALL existing sessions for this client to understand what's been "touched"
  const allExistingSessions = await db.query.SessionTable.findMany({
    where: and(eq(SessionTable.clientId, clientId), eq(SessionTable.branchId, branchId)),
    orderBy: SessionTable.sessionNumber,
  });

  // Separate sessions by status
  const completedSessions = allExistingSessions.filter((s) => s.status === 'COMPLETED');
  const inProgressSessions = allExistingSessions.filter((s) => s.status === 'IN_PROGRESS');
  const scheduledSessions = allExistingSessions.filter((s) => s.status === 'SCHEDULED');
  const otherSessions = allExistingSessions.filter(
    (s) => s.status !== 'COMPLETED' && s.status !== 'IN_PROGRESS' && s.status !== 'SCHEDULED'
  );

  // Count immutable sessions (completed + in-progress)
  const immutableSessionsCount = completedSessions.length + inProgressSessions.length;
  const totalSessionsNeeded = newSessions.length;

  // If we need fewer total sessions than we have immutable sessions, we can't proceed
  if (totalSessionsNeeded < immutableSessionsCount) {
    throw new Error(
      `Cannot reduce plan to ${totalSessionsNeeded} sessions as ${immutableSessionsCount} sessions have already been completed/started. Minimum allowed: ${immutableSessionsCount} sessions.`
    );
  }

  const updates: Promise<unknown>[] = [];
  const creates: Promise<unknown>[] = [];
  const deletes: Promise<unknown>[] = [];

  // Build map of existing session dates that can't be changed (completed/in-progress)
  const immutableDates = new Set(
    [...completedSessions, ...inProgressSessions].map((s) => s.sessionDate)
  );

  // Filter new sessions to only those that don't conflict with immutable dates
  const availableNewSessions = newSessions.filter((s) => !immutableDates.has(s.sessionDate));

  // Track session numbers that are already used by immutable sessions
  const usedSessionNumbers = new Set(
    [...completedSessions, ...inProgressSessions].map((s) => s.sessionNumber)
  );

  // Sort existing scheduled sessions by session number for consistent updating
  const sortedScheduledSessions = [...scheduledSessions].sort(
    (a, b) => a.sessionNumber - b.sessionNumber
  );

  let updatedCount = 0;
  let createdCount = 0;

  // Update existing SCHEDULED sessions with new dates/times
  for (let i = 0; i < Math.min(sortedScheduledSessions.length, availableNewSessions.length); i++) {
    const existingSession = sortedScheduledSessions[i];
    const newSessionData = availableNewSessions[i];

    updates.push(
      db
        .update(SessionTable)
        .set({
          sessionDate: newSessionData.sessionDate,
          startTime: newSessionData.startTime,
          endTime: newSessionData.endTime,
          vehicleId: newSessionData.vehicleId,
          planId: newSessionData.planId,
          updatedAt: new Date(),
        })
        .where(eq(SessionTable.id, existingSession.id))
        .returning()
        .then((updated) => {
          // Trigger workflow for updated session
          if (updated[0]) {
            triggerSessionWorkflow({
              sessionId: updated[0].id,
              sessionDate: updated[0].sessionDate,
              startTime: updated[0].startTime,
              endTime: updated[0].endTime,
            });
          }
          return updated;
        })
    );
    updatedCount++;
  }

  // Create new sessions if we need more than what we have
  if (availableNewSessions.length > sortedScheduledSessions.length) {
    const sessionsToCreate = availableNewSessions.slice(sortedScheduledSessions.length);

    for (const newSession of sessionsToCreate) {
      // Find next available session number
      let nextSessionNumber = 1;
      while (usedSessionNumbers.has(nextSessionNumber)) {
        nextSessionNumber++;
      }

      const createPromise = db
        .insert(SessionTable)
        .values({
          ...newSession,
          sessionNumber: nextSessionNumber,
          clientId,
          branchId,
          createdBy: userId!,
          status: 'SCHEDULED' as const,
        })
        .returning()
        .then((created) => {
          // Trigger workflow for new session
          if (created[0]) {
            triggerSessionWorkflow({
              sessionId: created[0].id,
              sessionDate: created[0].sessionDate,
              startTime: created[0].startTime,
              endTime: created[0].endTime,
            });
          }
          return created;
        });

      creates.push(createPromise);
      usedSessionNumbers.add(nextSessionNumber);
      createdCount++;
    }
  }

  // Delete excess scheduled sessions if we need fewer than what we have
  if (sortedScheduledSessions.length > availableNewSessions.length) {
    const sessionsToDelete = sortedScheduledSessions.slice(availableNewSessions.length);
    for (const session of sessionsToDelete) {
      deletes.push(db.delete(SessionTable).where(eq(SessionTable.id, session.id)));
    }
  }

  // Cancel any other non-completed, non-scheduled sessions (NO_SHOW, RESCHEDULED, etc.)
  for (const session of otherSessions) {
    if (session.status !== 'CANCELLED') {
      updates.push(
        db
          .update(SessionTable)
          .set({ status: 'CANCELLED', updatedAt: new Date() })
          .where(eq(SessionTable.id, session.id))
      );
    }
  }

  // Execute all operations
  await Promise.all([...updates, ...creates, ...deletes]);

  const deletedCount = Math.max(0, sortedScheduledSessions.length - availableNewSessions.length);

  return {
    updated: updatedCount,
    created: createdCount,
    deleted: deletedCount,
    preserved: immutableSessionsCount,
    message: `${completedSessions.length} completed and ${inProgressSessions.length} in-progress sessions preserved, ${updatedCount} sessions updated, ${createdCount} new sessions created, ${deletedCount} excess sessions deleted`,
  };
};

export type Session = Awaited<ReturnType<typeof getSessions>>[0];

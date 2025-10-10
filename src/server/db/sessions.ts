import { db } from '@/db';
import { SessionTable } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, and, ne } from 'drizzle-orm';
import { getBranchConfig } from '@/server/action/branch';

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

  return assignedSession[0];
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

  // Separate completed sessions and scheduled sessions
  const completedSessions = allExistingSessions.filter((s) => s.status === 'COMPLETED');
  const nonCompletedSessions = allExistingSessions.filter((s) => s.status !== 'COMPLETED');
  const scheduledSessions = nonCompletedSessions.filter((s) => s.status === 'SCHEDULED');
  const otherInProgressSessions = nonCompletedSessions.filter((s) => s.status !== 'SCHEDULED');

  // Count how many sessions we have total and how many more we need
  const totalSessionsNeeded = newSessions.length;
  const completedSessionsCount = completedSessions.length;
  const inProgressSessionsCount = otherInProgressSessions.length;
  const touchedSessionsCount = completedSessionsCount + inProgressSessionsCount;
  const remainingSessionsNeeded = Math.max(0, totalSessionsNeeded - touchedSessionsCount);

  const updates: Promise<unknown>[] = [];
  const creates: Promise<unknown>[] = [];
  const deletes: Promise<unknown>[] = [];

  // If we need fewer total sessions than we have touched sessions, we can't proceed
  if (totalSessionsNeeded < touchedSessionsCount) {
    throw new Error(
      `Cannot reduce plan to ${totalSessionsNeeded} sessions as ${touchedSessionsCount} sessions have already been completed/started. Minimum allowed: ${touchedSessionsCount} sessions.`
    );
  }
  // Delete all scheduled sessions (we'll recreate what's needed)
  if (scheduledSessions.length > 0) {
    for (const session of scheduledSessions) {
      deletes.push(db.delete(SessionTable).where(eq(SessionTable.id, session.id)));
    }
  }

  // Create new scheduled sessions for remaining slots
  if (remainingSessionsNeeded > 0) {
    // Find the next available session numbers (after touched sessions)
    const usedSessionNumbers = new Set(
      [...completedSessions, ...otherInProgressSessions].map((s) => s.sessionNumber)
    );

    // Track dates that already have completed or in-progress sessions to avoid duplicates
    const existingDates = new Set(
      [...completedSessions, ...otherInProgressSessions].map((s) => s.sessionDate)
    );

    console.log(`Existing session dates that will be skipped:`, Array.from(existingDates));

    const newSessionsToCreate = [];
    let nextSessionNumber = 1;
    let createdCount = 0;

    // Generate new sessions with available session numbers
    for (const newSession of newSessions) {
      // Skip creating new sessions for dates that already have completed or in-progress sessions
      if (existingDates.has(newSession.sessionDate)) {
        console.log(`Skipping new session creation for existing date: ${newSession.sessionDate}`);
        continue;
      }

      // Find next available session number
      while (usedSessionNumbers.has(nextSessionNumber)) {
        nextSessionNumber++;
      }

      if (createdCount < remainingSessionsNeeded) {
        newSessionsToCreate.push({
          ...newSession,
          sessionNumber: nextSessionNumber,
          clientId,
          branchId,
          createdBy: userId!,
          status: 'SCHEDULED' as const,
        });
        usedSessionNumbers.add(nextSessionNumber);
        createdCount++;
      }
      nextSessionNumber++;
    }

    if (newSessionsToCreate.length > 0) {
      creates.push(db.insert(SessionTable).values(newSessionsToCreate));
    }
  }

  // Execute all operations
  await Promise.all([...updates, ...creates, ...deletes]);

  return {
    updated: 0, // No longer updating any sessions
    created: remainingSessionsNeeded,
    deleted: scheduledSessions.length,
    preserved: completedSessionsCount + inProgressSessionsCount,
    message: `${completedSessionsCount} completed sessions preserved, ${inProgressSessionsCount} in-progress sessions preserved, ${scheduledSessions.length} scheduled sessions deleted, ${remainingSessionsNeeded} new sessions created`,
  };
};

export type Session = Awaited<ReturnType<typeof getSessions>>[0];

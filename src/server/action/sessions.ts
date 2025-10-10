'use server';

import {
  getSessions as getSessionsFromDB,
  createSessions as createSessionsInDB,
  updateSession as updateSessionInDB,
  cancelSession as cancelSessionInDB,
  assignSessionToSlot as assignSessionToSlotInDB,
  getSessionsByClientId as getSessionsByClientIdFromDB,
  updateScheduledSessionsForClient as updateScheduledSessionsForClientInDB,
} from '@/server/db/sessions';

export const getSessions = async (vehicleId?: string) => {
  return getSessionsFromDB(vehicleId);
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
  try {
    const createdSessions = await createSessionsInDB(sessions);
    return {
      error: false,
      message: `${sessions.length} sessions created successfully`,
      data: createdSessions,
    };
  } catch (error) {
    console.error('Error creating sessions:', error);
    return {
      error: true,
      message: 'Failed to create sessions',
    };
  }
};

export const updateSession = async (
  sessionId: string,
  updates: {
    startTime?: string;
    endTime?: string;
    status?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'RESCHEDULED';
  }
) => {
  try {
    const updatedSession = await updateSessionInDB(sessionId, updates);
    return {
      error: false,
      message: 'Session updated successfully',
      data: updatedSession,
    };
  } catch (error) {
    console.error('Error updating session:', error);
    return {
      error: true,
      message: 'Failed to update session',
    };
  }
};

export const cancelSession = async (sessionId: string) => {
  try {
    const cancelledSession = await cancelSessionInDB(sessionId);
    return {
      error: false,
      message: 'Session cancelled successfully',
      data: cancelledSession,
    };
  } catch (error) {
    console.error('Error cancelling session:', error);
    return {
      error: true,
      message: 'Failed to cancel session',
    };
  }
};

export const getSessionsByClientId = async (clientId: string) => {
  try {
    const sessions = await getSessionsByClientIdFromDB(clientId);
    return sessions;
  } catch (error) {
    console.error('Error getting sessions by client ID:', error);
    return [];
  }
};

export const assignSessionToSlot = async (
  clientId: string,
  vehicleId: string,
  sessionDate: string, // YYYY-MM-DD string
  startTime: string,
  endTime: string
) => {
  try {
    const assignedSession = await assignSessionToSlotInDB(
      clientId,
      vehicleId,
      sessionDate,
      startTime,
      endTime
    );
    return {
      error: false,
      message: 'Session assigned successfully',
      data: assignedSession,
    };
  } catch (error) {
    console.error('Error assigning session:', error);
    return {
      error: true,
      message: error instanceof Error ? error.message : 'Failed to assign session',
    };
  }
};

export const updateScheduledSessionsForClient = async (
  clientId: string,
  newSessions: Array<{
    sessionDate: string; // YYYY-MM-DD string
    startTime: string;
    endTime: string;
    vehicleId: string;
    planId: string;
    sessionNumber: number;
  }>
) => {
  try {
    const result = await updateScheduledSessionsForClientInDB(clientId, newSessions);
    return {
      error: false,
      message: `Sessions updated: ${result.updated} updated, ${result.created} created, ${result.deleted} deleted`,
      data: result,
    };
  } catch (error) {
    console.error('Error updating sessions:', error);
    return {
      error: true,
      message: error instanceof Error ? error.message : 'Failed to update sessions',
    };
  }
};

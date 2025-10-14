import { PlanTable } from '@/db/schema';
import { generateSessionsFromPlan } from '@/lib/sessions';
import { getBranchConfig } from '@/server/action/branch';
import {
  createSessions,
  getSessionsByClientId,
  updateScheduledSessionsForClient,
} from '@/server/action/sessions';
import { getClientForSessionsInDB } from '../server/db';
import { formatDateToYYYYMMDD } from '@/lib/date-time-utils';

/**
 * Check if plan configuration has changed
 */
export const hasPlanChanged = (
  existingPlan: typeof PlanTable.$inferSelect | null,
  newDate: Date | string,
  newTime: string,
  newData: { vehicleId: string; numberOfSessions: number }
): boolean => {
  if (!existingPlan?.joiningDate || !existingPlan.joiningTime) {
    return false;
  }

  const existingDate = formatDateToYYYYMMDD(new Date(existingPlan.joiningDate));
  const newDateStr = typeof newDate === 'string' ? newDate : formatDateToYYYYMMDD(newDate);

  return (
    existingDate !== newDateStr ||
    existingPlan.joiningTime !== newTime ||
    existingPlan.vehicleId !== newData.vehicleId ||
    existingPlan.numberOfSessions !== newData.numberOfSessions
  );
};

/**
 * Handle session creation or update based on plan changes
 */
export const handleSessionGeneration = async (
  clientId: string,
  planId: string,
  planData: {
    joiningDate: Date;
    joiningTime: string;
    numberOfSessions: number;
    vehicleId: string;
  },
  planTimingChanged: boolean,
  branchConfig?: Awaited<ReturnType<typeof getBranchConfig>>
): Promise<string> => {
  const existingSessions = await getSessionsByClientId(clientId);

  const shouldGenerateSessions = !planId || existingSessions.length === 0 || planTimingChanged;

  if (!shouldGenerateSessions) {
    return '';
  }

  // Get client details and branch config in parallel (if not provided)
  const [client, config] = await Promise.all([
    getClientForSessionsInDB(clientId),
    branchConfig ? Promise.resolve(branchConfig) : getBranchConfig(),
  ]);

  if (!client) {
    throw new Error(`Client not found with ID: ${clientId}`);
  }

  // Validate branch config has required fields
  if (!config.workingDays || config.workingDays.length === 0) {
    throw new Error('Branch working days not configured');
  }

  // Generate sessions
  const sessionsToGenerate = generateSessionsFromPlan(
    {
      joiningDate: planData.joiningDate,
      joiningTime: planData.joiningTime,
      numberOfSessions: planData.numberOfSessions,
      vehicleId: planData.vehicleId,
      planId,
    },
    client,
    config
  );

  if (sessionsToGenerate.length === 0) {
    console.warn(
      `No sessions generated for client ${clientId} with ${planData.numberOfSessions} requested sessions`
    );
    return ' but no sessions were generated';
  }

  if (sessionsToGenerate.length < planData.numberOfSessions) {
    console.warn(
      `Only ${sessionsToGenerate.length} of ${planData.numberOfSessions} sessions could be generated`
    );
  }

  // Update or create sessions
  if (planId && planTimingChanged && existingSessions.length > 0) {
    const updateResult = await updateScheduledSessionsForClient(
      clientId,
      sessionsToGenerate.map((s) => ({
        sessionDate: s.sessionDate,
        startTime: s.startTime,
        endTime: s.endTime,
        vehicleId: s.vehicleId,
        planId: s.planId,
        sessionNumber: s.sessionNumber,
      }))
    );
    return updateResult.error ? ' but session update failed' : ' and sessions updated';
  } else {
    const createResult = await createSessions(sessionsToGenerate);
    return createResult.error ? ' but session creation failed' : ' and sessions generated';
  }
};

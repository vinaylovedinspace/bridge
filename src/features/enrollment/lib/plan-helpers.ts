import { PlanTable } from '@/db/schema';
import { generateSessionsFromPlan } from '@/lib/sessions';
import { getBranchConfig } from '@/server/db/branch';
import {
  createSessions,
  getSessionsByClientId,
  updateScheduledSessionsForClient,
} from '@/server/actions/sessions';
import {
  createPlanInDB,
  updatePlanInDB,
  getClientForSessionsInDB,
  getVehicleRentAmount,
} from '../server/db';

/**
 * Extract time string (HH:MM) from Date object
 */
export const extractTimeString = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Check if plan configuration has changed
 */
export const hasPlanChanged = (
  existingPlan: typeof PlanTable.$inferSelect,
  newDate: Date,
  newTime: string,
  newData: { vehicleId: string; numberOfSessions: number }
): boolean => {
  if (!existingPlan.joiningDate || !existingPlan.joiningTime) {
    return false;
  }

  const existingDate = new Date(existingPlan.joiningDate).toISOString().split('T')[0];
  const newDateStr = newDate.toISOString().split('T')[0];

  return (
    existingDate !== newDateStr ||
    existingPlan.joiningTime !== newTime ||
    existingPlan.vehicleId !== newData.vehicleId ||
    existingPlan.numberOfSessions !== newData.numberOfSessions
  );
};

/**
 * Upsert plan (create or update)
 */
export const upsertPlan = async (
  existingPlan: typeof PlanTable.$inferSelect | null,
  providedPlanId: string | undefined,
  planData: Omit<
    typeof PlanTable.$inferInsert,
    'id' | 'planCode' | 'createdAt' | 'updatedAt' | 'vehicleRentAmount'
  >,
  tenantId: string
): Promise<{ planId: string; isExisting: boolean }> => {
  // Validate plan data before upsert
  if (!planData.clientId) {
    throw new Error('Client ID is required for plan');
  }

  if (!planData.vehicleId) {
    throw new Error('Vehicle ID is required for plan');
  }

  if (!planData.joiningDate) {
    throw new Error('Joining date is required for plan');
  }

  if (!planData.joiningTime) {
    throw new Error('Joining time is required for plan');
  }

  const vehicle = await getVehicleRentAmount(planData.vehicleId);

  if (!vehicle) {
    throw new Error('Vehicle not found');
  }

  const planDataWithVehicleRent = {
    ...planData,
    vehicleRentAmount: vehicle.rent,
  };

  // Update existing plan
  if (providedPlanId || existingPlan) {
    const planIdToUpdate = providedPlanId || existingPlan!.id;
    const result = await updatePlanInDB(planIdToUpdate, planDataWithVehicleRent);
    return { planId: result.planId, isExisting: true };
  }

  // Create new plan
  const result = await createPlanInDB(planDataWithVehicleRent, tenantId);
  return { planId: result.planId, isExisting: false };
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
  isExistingPlan: boolean,
  planTimingChanged: boolean
): Promise<string> => {
  // Validate inputs
  if (!clientId) {
    throw new Error('Client ID is required for session generation');
  }

  if (!planId) {
    throw new Error('Plan ID is required for session generation');
  }

  if (!planData.vehicleId) {
    throw new Error('Vehicle ID is required for session generation');
  }

  if (planData.numberOfSessions <= 0) {
    throw new Error('Number of sessions must be greater than 0');
  }

  const existingSessions = await getSessionsByClientId(clientId);

  const shouldGenerateSessions =
    !isExistingPlan || existingSessions.length === 0 || (isExistingPlan && planTimingChanged);

  if (!shouldGenerateSessions) {
    return '';
  }

  // Get client details
  const client = await getClientForSessionsInDB(clientId);

  if (!client) {
    throw new Error(`Client not found with ID: ${clientId}`);
  }

  const branchConfig = await getBranchConfig();

  // Validate branch config has required fields
  if (!branchConfig.workingDays || branchConfig.workingDays.length === 0) {
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
    branchConfig
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
  if (isExistingPlan && planTimingChanged && existingSessions.length > 0) {
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

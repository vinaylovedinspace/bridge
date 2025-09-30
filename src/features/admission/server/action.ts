'use server';

import { z } from 'zod';
import {
  learningLicenseSchema,
  LearningLicenseValues,
  DrivingLicenseValues,
  personalInfoSchema,
  drivingLicenseSchema,
  PlanValues,
  planSchema,
  paymentSchema,
} from '../types';
import { getBranchConfig } from '@/server/db/branch';
import { ActionReturnType } from '@/types/actions';
import {
  upsertClientInDB,
  upsertLearningLicenseInDB,
  upsertDrivingLicenseInDB,
  getClientById as getClientByIdFromDB,
  upsertPlanInDB,
  upsertPaymentInDB,
  createFullPaymentInDB,
  createInstallmentPaymentsInDB,
} from './db';
import { db } from '@/db';
import { eq, and, isNull } from 'drizzle-orm';
import { PlanTable } from '@/db/schema/plan/columns';
import { VehicleTable } from '@/db/schema/vehicles/columns';
import { ClientTable } from '@/db/schema/client/columns';
import { calculatePaymentAmounts } from '@/lib/payment/calculate';
import { generateSessionsFromPlan } from '@/lib/sessions';
import { dateToString } from '@/lib/date-utils';
import {
  createSessions,
  getSessionsByClientId,
  updateScheduledSessionsForClient,
} from '@/server/actions/sessions';
import {
  createPaymentLink,
  CreatePaymentLinkRequest,
  PaymentLinkResult,
} from '@/lib/cashfree/payment-links';

export const createClient = async (
  unsafeData: z.infer<typeof personalInfoSchema>
): Promise<{ error: boolean; message: string } & { clientId?: string }> => {
  const { id: branchId, tenantId } = await getBranchConfig();

  try {
    // Safely convert birthDate to string, handling edge cases
    const birthDateString =
      unsafeData.birthDate instanceof Date
        ? dateToString(unsafeData.birthDate)
        : typeof unsafeData.birthDate === 'string'
          ? unsafeData.birthDate
          : '';

    if (!birthDateString) {
      return { error: true, message: 'Birth date is required' };
    }

    const { isExistingClient, clientId } = await upsertClientInDB({
      ...unsafeData,
      branchId,
      tenantId,
      birthDate: birthDateString, // Convert to YYYY-MM-DD string
    });

    return {
      error: false,
      message: isExistingClient
        ? 'Client information updated successfully'
        : 'Client created successfully',
      clientId,
    };
  } catch (error) {
    console.error('Error creating client:', error);
    return { error: true, message: 'Failed to create client' };
  }
};

export const createLearningLicense = async (data: LearningLicenseValues): ActionReturnType => {
  try {
    // Validate the learning license data
    const parseResult = learningLicenseSchema.safeParse(data);

    if (!parseResult.success) {
      return { error: true, message: 'Invalid learning license data' };
    }

    // Ensure clientId is present for database operation
    if (!parseResult.data.clientId && !data.clientId) {
      return { error: true, message: 'Client ID is required' };
    }

    const learningLicenseData = {
      ...parseResult.data,
      clientId: parseResult.data.clientId || data.clientId || '',
      // Convert date fields to YYYY-MM-DD strings
      testConductedOn: parseResult.data.testConductedOn
        ? dateToString(parseResult.data.testConductedOn)
        : null,
      issueDate: parseResult.data.issueDate ? dateToString(parseResult.data.issueDate) : null,
      expiryDate: parseResult.data.expiryDate ? dateToString(parseResult.data.expiryDate) : null,
    };

    // Create or update the learning license
    const { isExistingLicense } = await upsertLearningLicenseInDB(learningLicenseData);

    const action = isExistingLicense ? 'updated' : 'created';
    return {
      error: false,
      message: `Learning license ${action} successfully`,
    };
  } catch (error) {
    console.error('Error processing learning license data:', error);
    return { error: true, message: 'Failed to save learning license information' };
  }
};

export const createDrivingLicense = async (data: DrivingLicenseValues): ActionReturnType => {
  try {
    // Validate the driving license data
    const parseResult = drivingLicenseSchema.safeParse(data);
    console.log('Driving license data:', JSON.stringify(data, null, 2));

    if (!parseResult.success) {
      console.log(
        'Driving license validation errors:',
        JSON.stringify(parseResult.error.issues, null, 2)
      );
      return {
        error: true,
        message: `Invalid driving license data: ${parseResult.error.issues.map((i) => i.message).join(', ')}`,
      };
    }

    // Ensure clientId is present for database operation
    if (!parseResult.data.clientId && !data.clientId) {
      return { error: true, message: 'Client ID is required' };
    }

    const drivingLicenseData = {
      ...parseResult.data,
      clientId: parseResult.data.clientId || data.clientId || '',
      // Convert date fields to YYYY-MM-DD strings
      appointmentDate: parseResult.data.appointmentDate
        ? dateToString(parseResult.data.appointmentDate)
        : null,
      issueDate: parseResult.data.issueDate ? dateToString(parseResult.data.issueDate) : null,
      expiryDate: parseResult.data.expiryDate ? dateToString(parseResult.data.expiryDate) : null,
    };

    // Create or update the driving license
    const { isExistingLicense } = await upsertDrivingLicenseInDB(drivingLicenseData);

    const action = isExistingLicense ? 'updated' : 'created';
    return {
      error: false,
      message: `Driving license ${action} successfully`,
    };
  } catch (error) {
    console.error('Error processing driving license data:', error);
    return { error: true, message: 'Failed to save driving license information' };
  }
};

export const getClientById = async (
  clientId: string
): Promise<
  { error: boolean; message: string } & { data?: Awaited<ReturnType<typeof getClientByIdFromDB>> }
> => {
  if (!clientId) {
    return { error: true, message: 'Client ID is required' };
  }

  try {
    const clientData = await getClientByIdFromDB(clientId);

    if (!clientData) {
      return { error: true, message: 'Client not found' };
    }

    return {
      error: false,
      message: 'Client data retrieved successfully',
      data: clientData,
    };
  } catch (error) {
    console.error('Error fetching client:', error);
    return { error: true, message: 'Failed to fetch client data' };
  }
};

export const createPlan = async (
  data: PlanValues
): Promise<{ error: boolean; message: string } & { planId?: string }> => {
  try {
    // Extract time from the joiningDate and format it as a string
    const joiningDateTime = data.joiningDate;
    const hours = joiningDateTime.getHours().toString().padStart(2, '0');
    const minutes = joiningDateTime.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    // Validate the plan data
    const parseResult = planSchema.safeParse({ ...data, joiningTime: timeString });

    if (!parseResult.success) {
      return { error: true, message: 'Invalid plan data' };
    }

    // Check if there's an existing plan for this client
    let existingPlan = null;
    if (data.id) {
      // If we have a plan ID, fetch the existing plan details
      existingPlan = await db.query.PlanTable.findFirst({
        where: eq(PlanTable.id, data.id),
      });
    } else {
      // Otherwise, try to find a plan by client ID
      existingPlan = await db.query.PlanTable.findFirst({
        where: eq(PlanTable.clientId, data.clientId),
      });
    }

    // Check if the plan timing has changed
    let planTimingChanged = false;
    if (existingPlan) {
      const existingDate = existingPlan.joiningDate ? new Date(existingPlan.joiningDate) : null;
      const existingTime = existingPlan.joiningTime;

      // Check if date or time has changed
      if (existingDate && existingTime) {
        const formattedExistingDate = existingDate.toISOString().split('T')[0];
        const formattedNewDate = joiningDateTime.toISOString().split('T')[0];

        planTimingChanged =
          formattedExistingDate !== formattedNewDate ||
          existingTime !== timeString ||
          existingPlan.vehicleId !== data.vehicleId ||
          existingPlan.numberOfSessions !== data.numberOfSessions;
      }
    }

    // Convert date to YYYY-MM-DD string (no timezone conversion)
    const dateString = dateToString(data.joiningDate);

    // Make sure we're explicitly passing the joiningDate and joiningTime for update
    const planData = {
      ...parseResult.data,
      joiningDate: dateString, // Pass as YYYY-MM-DD string, no timezone conversion
      joiningTime: timeString, // Explicitly pass the formatted time
    };

    // Create or update the plan with separated date and time
    const { isExistingPlan, planId } = await upsertPlanInDB(planData);

    // Check if sessions already exist for this client
    const existingSessions = await getSessionsByClientId(data.clientId);

    // Determine if we need to regenerate sessions
    const shouldGenerateSessions =
      !isExistingPlan || // New plan
      existingSessions.length === 0 || // No existing sessions
      (isExistingPlan && planTimingChanged); // Plan timing changed

    let sessionMessage = '';

    if (shouldGenerateSessions) {
      // Get client details for session generation
      const clientDetails = await db.query.ClientTable.findFirst({
        where: eq(ClientTable.id, data.clientId),
        columns: {
          id: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!clientDetails) {
        return { error: true, message: 'Client not found' };
      }

      // Get branch configuration
      const branchConfig = await getBranchConfig();

      // Generate sessions from plan data
      const sessionsToGenerate = generateSessionsFromPlan(
        {
          joiningDate: data.joiningDate,
          joiningTime: timeString,
          numberOfSessions: data.numberOfSessions,
          vehicleId: data.vehicleId,
        },
        {
          id: clientDetails.id,
          firstName: clientDetails.firstName,
          lastName: clientDetails.lastName,
        },
        branchConfig
      );

      if (sessionsToGenerate.length > 0) {
        if (isExistingPlan && planTimingChanged && existingSessions.length > 0) {
          // Update existing sessions instead of creating duplicates
          const updateResult = await updateScheduledSessionsForClient(
            data.clientId,
            sessionsToGenerate.map((session) => ({
              sessionDate: session.sessionDate, // Already a string from generateSessionsFromPlan
              startTime: session.startTime,
              endTime: session.endTime,
              vehicleId: session.vehicleId,
              sessionNumber: session.sessionNumber,
            }))
          );

          if (updateResult.error) {
            console.error('Failed to update sessions:', updateResult.message);
            sessionMessage = ' but session update failed';
          } else {
            sessionMessage = ' and sessions updated';
          }
        } else {
          // Create new sessions for new plans
          const createResult = await createSessions(sessionsToGenerate);
          if (createResult.error) {
            console.error('Failed to create sessions:', createResult.message);
            sessionMessage = ' but session creation failed';
          } else {
            sessionMessage = ' and sessions generated';
          }
        }
      }
    }

    const action = isExistingPlan ? 'updated' : 'created';

    return {
      error: false,
      message: `Plan ${action} successfully${sessionMessage}`,
      planId,
    };
  } catch (error) {
    console.error('Error processing plan data:', error);
    return { error: true, message: 'Failed to save plan information' };
  }
};

export const createPayment = async (
  unsafeData: z.infer<typeof paymentSchema>
): Promise<{ error: boolean; message: string; paymentId?: string }> => {
  if (!unsafeData.planId) {
    return { error: true, message: 'Plan ID is required' };
  }

  // Get the plan and vehicle data to calculate the original amount
  const plan = await db.query.PlanTable.findFirst({
    where: eq(PlanTable.id, unsafeData.planId),
  });

  if (!plan) {
    return { error: true, message: 'Plan not found' };
  }

  const vehicle = await db.query.VehicleTable.findFirst({
    where: and(eq(VehicleTable.id, plan.vehicleId), isNull(VehicleTable.deletedAt)),
  });

  if (!vehicle) {
    return { error: true, message: 'Vehicle not found' };
  }

  // Use the utility function to calculate payment amounts
  const { originalAmount, finalAmount } = calculatePaymentAmounts({
    sessions: plan.numberOfSessions,
    duration: plan.sessionDurationInMinutes,
    rate: vehicle.rent,
    discount: unsafeData.discount,
    paymentType: unsafeData.paymentType,
  });

  try {
    const { success, data, error } = paymentSchema.safeParse({
      ...unsafeData,
      originalAmount,
      finalAmount,
    });

    if (!success) {
      console.error('Payment validation error:', error);
      return { error: true, message: 'Invalid payment data' };
    }

    // Create or update the payment
    const { isExistingPayment, paymentId } = await upsertPaymentInDB({
      ...data,
      vehicleRentAmount: vehicle.rent,
    });

    // Create FullPayment or InstallmentPayment entries if paymentMode is CASH
    if (data.paymentMode === 'CASH' || data.paymentMode === 'QR') {
      const currentDate = dateToString(new Date());

      if (data.paymentType === 'FULL_PAYMENT') {
        await createFullPaymentInDB({
          paymentId,
          paymentMode: 'CASH',
          paymentDate: currentDate,
          isPaid: true,
        });
      } else if (data.paymentType === 'INSTALLMENTS') {
        const firstInstallmentAmount = Math.ceil(finalAmount / 2);

        await createInstallmentPaymentsInDB([
          {
            paymentId,
            installmentNumber: 1,
            amount: firstInstallmentAmount,
            paymentMode: 'CASH',
            paymentDate: currentDate,
            isPaid: true,
          },
        ]);
      }
    }

    // Check if sessions need to be created when payment is completed (onboarding finished)
    if (paymentId && !isExistingPayment) {
      try {
        // Get the plan details
        const plan = await db.query.PlanTable.findFirst({
          where: eq(PlanTable.id, unsafeData.planId),
        });

        if (plan) {
          // Check if sessions already exist for this client (created by createPlan)
          const existingSessions = await getSessionsByClientId(plan.clientId);

          if (existingSessions.length === 0) {
            // Only create sessions if none exist (fallback in case createPlan didn't create them)
            const client = await db.query.ClientTable.findFirst({
              where: eq(ClientTable.id, plan.clientId),
            });

            if (client) {
              // Get branch config for session generation
              const branchConfig = await getBranchConfig();

              // Generate sessions from plan
              const sessions = generateSessionsFromPlan(
                {
                  joiningDate: plan.joiningDate,
                  joiningTime: plan.joiningTime,
                  numberOfSessions: plan.numberOfSessions,
                  vehicleId: plan.vehicleId,
                },
                {
                  firstName: client.firstName,
                  lastName: client.lastName,
                  id: client.id,
                },
                branchConfig
              );

              // Create the sessions
              const sessionsResult = await createSessions(sessions);
              if (sessionsResult.error) {
                console.error('Failed to create sessions:', sessionsResult.message);
              } else {
                console.log('Successfully created sessions as fallback:', sessionsResult.message);
              }
            }
          } else {
            console.log(
              `Sessions already exist for client (${existingSessions.length} sessions), skipping creation in payment step`
            );
          }
        }
      } catch (sessionError) {
        console.error('Error creating sessions:', sessionError);
        // Don't fail the payment if session creation fails
      }
    }

    return {
      error: false,
      message: 'Payment created successfully',
      paymentId,
    };
  } catch (error) {
    console.error('Error processing payment data:', error);
    return { error: true, message: 'Failed to save payment information' };
  }
};

export async function createPaymentLinkAction(
  request: CreatePaymentLinkRequest
): Promise<PaymentLinkResult> {
  try {
    const result = await createPaymentLink(request);
    return result;
  } catch (error) {
    console.error('Failed to create payment link:', error);
    return {
      success: false,
      error: 'Failed to create payment link. Please try again.',
    };
  }
}

// Update functions (aliases for the existing upsert functions)
export const updateClient = async (
  _clientId: string,
  data: z.infer<typeof personalInfoSchema>
): ActionReturnType => {
  return createClient(data);
};

export const updateLearningLicense = async (
  _licenseId: string,
  data: LearningLicenseValues
): ActionReturnType => {
  return createLearningLicense(data);
};

export const updateDrivingLicense = async (
  _licenseId: string,
  data: DrivingLicenseValues
): ActionReturnType => {
  return createDrivingLicense(data);
};

export const updatePlan = async (_planId: string, data: PlanValues): ActionReturnType => {
  return createPlan(data);
};

export const updatePayment = async (
  _paymentId: string,
  data: z.infer<typeof paymentSchema>
): ActionReturnType => {
  return createPayment(data);
};

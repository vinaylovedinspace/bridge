'use server';

import { z } from 'zod';
import { DEFAULT_WORKING_DAYS, DEFAULT_OPERATING_HOURS } from '@/lib/constants/business';
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
import { auth } from '@clerk/nextjs/server';
import {
  getCurrentOrganizationBranchId,
  getCurrentOrganizationBranch,
  getCurrentOrganizationTenantId,
} from '@/server/db/branch';
import { ActionReturnType } from '@/types/actions';
import {
  upsertClientInDB,
  upsertLearningLicenseInDB,
  upsertDrivingLicenseInDB,
  getClientById as getClientByIdFromDB,
  upsertPlanInDB,
  upsertPaymentInDB,
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
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return { error: true, message: 'User not authenticated or not in an organization' };
  }

  const branchId = await getCurrentOrganizationBranchId();
  const tenantId = await getCurrentOrganizationTenantId();

  if (!branchId) {
    return { error: true, message: 'Branch not found' };
  }

  if (!tenantId) {
    return { error: true, message: 'Tenant not found' };
  }

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
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return { error: true, message: 'User not authenticated or not in an organization' };
  }

  const branchId = await getCurrentOrganizationBranchId();

  if (!branchId) {
    return { error: true, message: 'Branch not found' };
  }

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
  const { userId, orgId } = await auth();
  console.log(data, 'data');
  if (!userId || !orgId) {
    return { error: true, message: 'User not authenticated or not in an organization' };
  }

  const branchId = await getCurrentOrganizationBranchId();

  if (!branchId) {
    return { error: true, message: 'Branch not found' };
  }

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
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return { error: true, message: 'User not authenticated or not in an organization' };
  }

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
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return { error: true, message: 'User not authenticated or not in an organization' };
  }

  const branchId = await getCurrentOrganizationBranchId();

  if (!branchId) {
    return { error: true, message: 'Branch not found' };
  }

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
      const branchConfigResult = await getBranchConfig();
      if (branchConfigResult.error || !branchConfigResult.data) {
        return { error: true, message: 'Failed to get branch configuration' };
      }

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
        branchConfigResult.data
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
  const { userId } = await auth();

  console.log('Payment data received:', JSON.stringify(unsafeData, null, 2));
  if (!userId) {
    return { error: true, message: 'Unauthorized' };
  }

  const branchId = await getCurrentOrganizationBranchId();

  if (!branchId) {
    return { error: true, message: 'Branch not found' };
  }

  if (!unsafeData.planId) {
    return { error: true, message: 'Plan ID is required' };
  }

  try {
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
    const { originalAmount, finalAmount, firstInstallmentAmount, secondInstallmentAmount } =
      calculatePaymentAmounts({
        sessions: plan.numberOfSessions,
        duration: plan.sessionDurationInMinutes,
        rate: vehicle.rent,
        discount: unsafeData.discount,
        paymentType: unsafeData.paymentType,
      });

    const { data } = paymentSchema.safeParse({ ...unsafeData, originalAmount, finalAmount });

    // Check if payment mode is cash to automatically mark as paid
    const isCashPayment =
      (data?.paymentType === 'FULL_PAYMENT' && data?.fullPaymentMode === 'CASH') ||
      (data?.paymentType === 'INSTALLMENTS' &&
        (data?.firstPaymentMode === 'CASH' || data?.secondPaymentMode === 'CASH'));

    console.log('Payment data received:', JSON.stringify(data, null, 2));
    console.log('Is cash payment:', isCashPayment);

    // Validate the payment data with our calculated values
    const paymentData = {
      ...data,
      originalAmount,
      finalAmount,
      firstInstallmentAmount,
      secondInstallmentAmount,
      // Convert Date objects to string format for the database
      fullPaymentDate: data?.paymentType === 'FULL_PAYMENT' ? new Date().toISOString() : null,
      firstInstallmentDate: data?.paymentType === 'INSTALLMENTS' ? new Date().toISOString() : null,
      secondInstallmentDate:
        data?.paymentType === 'INSTALLMENTS' && data?.secondInstallmentDate
          ? new Date(data.secondInstallmentDate).toISOString()
          : null,
      paymentDueDate:
        data?.paymentType === 'PAY_LATER' && data?.paymentDueDate
          ? new Date(data.paymentDueDate).toISOString()
          : null,
      // Auto-mark cash payments as paid
      fullPaymentPaid:
        data?.paymentType === 'FULL_PAYMENT' && data?.fullPaymentMode === 'CASH'
          ? true
          : data?.fullPaymentPaid || false,
      firstInstallmentPaid:
        data?.paymentType === 'INSTALLMENTS' && data?.firstPaymentMode === 'CASH'
          ? true
          : data?.firstInstallmentPaid || false,
      // Auto-set payment status for cash payments
      paymentStatus: isCashPayment
        ? data?.paymentType === 'FULL_PAYMENT'
          ? 'FULLY_PAID'
          : data?.paymentType === 'INSTALLMENTS'
            ? data?.firstPaymentMode === 'CASH' && data?.secondPaymentMode === 'CASH'
              ? 'FULLY_PAID'
              : 'PARTIALLY_PAID'
            : 'PENDING'
        : data?.paymentStatus || 'PENDING',
    };

    console.log('Final payment data being validated:', JSON.stringify(paymentData, null, 2));

    const parseResult = paymentSchema.safeParse(paymentData);

    if (!parseResult.success) {
      console.error('Payment validation error:', parseResult.error);
      return { error: true, message: 'Invalid payment data' };
    }

    console.log('Payment data after validation:', JSON.stringify(parseResult.data, null, 2));

    // Create or update the payment
    const { isExistingPayment, paymentId } = await upsertPaymentInDB(parseResult.data);

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
              const branch = await getCurrentOrganizationBranch();
              const branchConfig = {
                workingDays: branch?.workingDays || DEFAULT_WORKING_DAYS,
                operatingHours: branch?.operatingHours || DEFAULT_OPERATING_HOURS,
              };

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

    // Create transaction records for cash payments
    if (isCashPayment && paymentId) {
      const { TransactionTable } = await import('@/db/schema/transactions/columns');

      try {
        // Create transaction for full payment
        if (data?.paymentType === 'FULL_PAYMENT' && data?.fullPaymentMode === 'CASH') {
          await db.insert(TransactionTable).values({
            paymentId,
            amount: finalAmount,
            paymentMode: 'CASH',
            transactionStatus: 'SUCCESS',
            transactionReference: `CASH-${Date.now()}`,
            notes: 'Cash payment received',
          });
        }

        // Create transaction for first installment if cash
        if (data?.paymentType === 'INSTALLMENTS' && data?.firstPaymentMode === 'CASH') {
          await db.insert(TransactionTable).values({
            paymentId,
            amount: firstInstallmentAmount,
            paymentMode: 'CASH',
            transactionStatus: 'SUCCESS',
            transactionReference: `CASH-INST1-${Date.now()}`,
            notes: 'First installment cash payment received',
            installmentNumber: 1,
          });
        }

        // Create transaction for second installment if cash
        if (data?.paymentType === 'INSTALLMENTS' && data?.secondPaymentMode === 'CASH') {
          await db.insert(TransactionTable).values({
            paymentId,
            amount: secondInstallmentAmount,
            paymentMode: 'CASH',
            transactionStatus: 'SUCCESS',
            transactionReference: `CASH-INST2-${Date.now()}`,
            notes: 'Second installment cash payment received',
            installmentNumber: 2,
          });
        }
      } catch (transactionError) {
        console.error('Error creating cash transaction records:', transactionError);
        // Don't fail the payment creation if transaction logging fails
      }
    }

    const action = isExistingPayment ? 'updated' : 'created';
    const cashMessage = isCashPayment ? ' and marked as paid (cash received)' : '';
    return {
      error: false,
      message: `Payment ${action} successfully${cashMessage}`,
      paymentId,
    };
  } catch (error) {
    console.error('Error processing payment data:', error);
    return { error: true, message: 'Failed to save payment information' };
  }
};

export const getBranchConfig = async (): Promise<{
  error: boolean;
  message: string;
  data?: {
    workingDays: number[];
    operatingHours: { start: string; end: string };
    licenseServiceCharge: number;
  };
}> => {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return { error: true, message: 'User not authenticated or not in an organization' };
  }

  try {
    const branch = await getCurrentOrganizationBranch();

    if (!branch) {
      return { error: true, message: 'Branch not found' };
    }

    return {
      error: false,
      message: 'Branch configuration retrieved successfully',
      data: {
        workingDays: branch.workingDays || DEFAULT_WORKING_DAYS,
        operatingHours: branch.operatingHours || DEFAULT_OPERATING_HOURS,
        licenseServiceCharge: branch.licenseServiceCharge || 500,
      },
    };
  } catch (error) {
    console.error('Error fetching branch config:', error);
    return { error: true, message: 'Failed to fetch branch configuration' };
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

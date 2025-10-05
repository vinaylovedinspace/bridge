'use server';

import { z } from 'zod';
import {
  LearningLicenseValues,
  DrivingLicenseValues,
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
  findExistingPlanInDB,
  getPlanAndVehicleInDB,
  upsertPaymentInDB,
} from './db';
import { db } from '@/db';
import { eq, and } from 'drizzle-orm';
import { ClientTable } from '@/db/schema/client/columns';
import { dateToString } from '@/lib/date-utils';
import {
  createPaymentLink,
  CreatePaymentLinkRequest,
  PaymentLinkResult,
} from '@/lib/cashfree/payment-links';
import { personalInfoSchema } from '@/types/zod/client';
import { drivingLicenseSchema, learningLicenseSchema } from '@/types/zod/license';
import {
  extractTimeString,
  hasPlanChanged,
  upsertPlan,
  handleSessionGeneration,
} from '../lib/plan-helpers';
import {
  calculatePaymentAmounts,
  createFallbackSessions,
  handleFullPayment,
  handleInstallmentPayment,
} from '../lib/payment-helpers';

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
      return { error: true, message: 'Invalid learning licence data' };
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
      message: `Learning licence ${action} successfully`,
    };
  } catch (error) {
    console.error('Error processing learning license data:', error);
    return { error: true, message: 'Failed to save learning licence information' };
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
        message: `Invalid driving licence data: ${parseResult.error.issues.map((i) => i.message).join(', ')}`,
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
      message: `Driving licence ${action} successfully`,
    };
  } catch (error) {
    console.error('Error processing driving license data:', error);
    return { error: true, message: 'Failed to save driving licence information' };
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
  const { tenantId, id: branchId } = await getBranchConfig();

  try {
    // 1. Extract and validate time
    const timeString = extractTimeString(data.joiningDate);
    const parseResult = planSchema.safeParse({ ...data, joiningTime: timeString });

    if (!parseResult.success) {
      return { error: true, message: 'Invalid plan data' };
    }

    // 2. Find existing plan (if any)
    const existingPlan = await findExistingPlanInDB(data.id, data.clientId);

    // 3. Check if plan has changed
    const planTimingChanged = existingPlan
      ? hasPlanChanged(existingPlan, data.joiningDate, timeString, data)
      : false;

    // 4. Prepare plan data for database
    const planData = {
      ...parseResult.data,
      joiningDate: dateToString(data.joiningDate),
      joiningTime: timeString,
      branchId,
    };

    // 5. Upsert the plan
    const { planId, isExisting: isExistingPlan } = await upsertPlan(
      existingPlan,
      data.id,
      planData,
      tenantId
    );

    // 6. Handle session generation/update
    const sessionMessage = await handleSessionGeneration(
      data.clientId,
      planId,
      {
        joiningDate: data.joiningDate,
        joiningTime: timeString,
        numberOfSessions: data.numberOfSessions,
        vehicleId: data.vehicleId,
      },
      isExistingPlan,
      planTimingChanged
    );

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
  unsafeData: z.infer<typeof paymentSchema>,
  planId: string
): Promise<{ error: boolean; message: string; paymentId?: string }> => {
  try {
    // 1. Get plan and vehicle for payment calculation
    const result = await getPlanAndVehicleInDB(planId);

    if (!result) {
      return { error: true, message: 'Plan or vehicle not found' };
    }

    const { plan, vehicle } = result;

    // 2. Calculate payment amounts
    const { originalAmount, finalAmount, firstInstallmentAmount, secondInstallmentAmount } =
      calculatePaymentAmounts(plan, vehicle, unsafeData.discount, unsafeData.paymentType);

    // 3. Validate payment data
    const { success, data, error } = paymentSchema.safeParse({
      ...unsafeData,
      originalAmount,
      finalAmount,
    });

    if (!success) {
      console.error('Payment validation error:', error);
      return { error: true, message: 'Invalid payment data' };
    }

    // 4. Upsert payment
    const { paymentId, isExistingPayment } = await upsertPaymentInDB(data, planId);

    // 5. Handle payment transactions (CASH or QR)
    if (data.paymentMode === 'CASH' || data.paymentMode === 'QR') {
      if (data.paymentType === 'FULL_PAYMENT') {
        await handleFullPayment(paymentId, data.paymentMode);
      } else if (data.paymentType === 'INSTALLMENTS') {
        await handleInstallmentPayment(
          paymentId,
          data.paymentMode,
          firstInstallmentAmount,
          secondInstallmentAmount
        );
      }
    }

    // 6. Create fallback sessions if needed (for new payments only)
    if (!isExistingPayment) {
      try {
        await createFallbackSessions(planId);
      } catch (sessionError) {
        console.error('Error creating fallback sessions:', sessionError);
        // Don't fail the payment if session creation fails
      }
    }

    return {
      error: false,
      message: 'Payment acknowledged successfully',
      paymentId,
    };
  } catch (error) {
    console.error('Error processing payment data:', error);
    const message = error instanceof Error ? error.message : 'Failed to save payment information';
    return { error: true, message };
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

export const checkPhoneNumberExists = async (phoneNumber: string) => {
  const { tenantId } = await getBranchConfig();

  try {
    const client = await db.query.ClientTable.findFirst({
      where: and(eq(ClientTable.phoneNumber, phoneNumber), eq(ClientTable.tenantId, tenantId)),
      with: {
        learningLicense: true,
        drivingLicense: true,
      },
    });

    if (client) {
      return {
        exists: true,
        client,
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('Error checking phone number:', error);
    return { exists: false };
  }
};

export const checkAadhaarNumberExists = async (aadhaarNumber: string) => {
  const { tenantId } = await getBranchConfig();

  try {
    const client = await db.query.ClientTable.findFirst({
      where: and(eq(ClientTable.aadhaarNumber, aadhaarNumber), eq(ClientTable.tenantId, tenantId)),
      with: {
        learningLicense: true,
        drivingLicense: true,
      },
    });

    if (client) {
      return {
        exists: true,
        client,
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('Error checking Aadhaar number:', error);
    return { exists: false };
  }
};

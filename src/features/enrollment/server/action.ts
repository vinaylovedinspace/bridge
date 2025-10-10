'use server';

import { z } from 'zod';
import {
  LearningLicenseValues,
  DrivingLicenseValues,
  PlanValues,
  planSchema,
  PaymentValues,
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
  upsertPlanAndPaymentInDB,
  getVehicleRentAmount,
} from './db';
import { dateToString } from '@/lib/date-utils';
import {
  createPaymentLink,
  CreatePaymentLinkRequest,
  PaymentLinkResult,
} from '@/lib/cashfree/payment-links';
import { clientSchema } from '@/types/zod/client';
import { drivingLicenseSchema, learningLicenseSchema } from '@/types/zod/license';
import {
  extractTimeString,
  hasPlanChanged,
  upsertPlan,
  handleSessionGeneration,
} from '../lib/plan-helpers';
import {
  createFallbackSessions,
  handleFullPayment,
  handleInstallmentPayment,
} from '../lib/payment-helpers';
import { paymentSchema } from '@/types/zod/payment';
import { calculateEnrollmentPaymentBreakdown } from '@/lib/payment/calculate';
import { IMMEDIATE_PAYMENT_MODES } from '@/lib/constants/payment';
import { getNextPlanCode } from '@/db/utils/plan-code';

export const createClient = async (
  unsafeData: z.infer<typeof clientSchema>
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
      id: unsafeData.id, // Pass the client ID if editing
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

async function processPaymentTransaction(
  paymentId: string,
  paymentMode: 'CASH' | 'QR',
  paymentType: string,
  firstInstallmentAmount: number,
  secondInstallmentAmount: number
): Promise<void> {
  if (paymentType === 'FULL_PAYMENT') {
    await handleFullPayment(paymentId, paymentMode);
  } else if (paymentType === 'INSTALLMENTS') {
    await handleInstallmentPayment(
      paymentId,
      paymentMode,
      firstInstallmentAmount,
      secondInstallmentAmount
    );
  }
}

export const createPayment = async (
  unsafeData: z.infer<typeof paymentSchema>,
  planId: string
): Promise<{ error: boolean; message: string; paymentId?: string }> => {
  try {
    // 1. Fetch plan and vehicle data
    const planResult = await getPlanAndVehicleInDB(planId);
    if (!planResult) {
      return { error: true, message: 'Plan or vehicle not found' };
    }

    const { plan, vehicle } = planResult;
    const { id: branchId } = await getBranchConfig();

    // 2. Calculate payment breakdown
    const paymentBreakdown = calculateEnrollmentPaymentBreakdown({
      sessions: plan.numberOfSessions,
      duration: plan.sessionDurationInMinutes,
      rate: vehicle.rent,
      discount: unsafeData.discount,
      paymentType: unsafeData.paymentType,
      licenseServiceFee: unsafeData.licenseServiceFee,
    });

    // 3. Validate payment data with calculated total
    const validationResult = paymentSchema.safeParse({
      ...unsafeData,
      branchId,
      totalAmount: paymentBreakdown.totalAmountAfterDiscount,
    });

    if (!validationResult.success) {
      console.error('[createPayment] Validation failed:', validationResult.error.format());
      return { error: true, message: 'Invalid payment data' };
    }

    // 4. Persist payment to database
    const { paymentId, isExistingPayment } = await upsertPaymentInDB(validationResult.data, planId);

    // 5. Process immediate payment transactions
    const paymentMode = validationResult.data.paymentMode;
    if (IMMEDIATE_PAYMENT_MODES.includes(paymentMode as (typeof IMMEDIATE_PAYMENT_MODES)[number])) {
      await processPaymentTransaction(
        paymentId,
        paymentMode as 'CASH' | 'QR',
        validationResult.data.paymentType,
        paymentBreakdown.firstInstallmentAmount,
        paymentBreakdown.secondInstallmentAmount
      );
    }

    // 6. Schedule sessions for new payments (non-blocking)
    if (!isExistingPayment) {
      createFallbackSessions(planId);
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

export const createPlanWithPayment = async (
  planData: PlanValues,
  paymentData: PaymentValues
): Promise<{ error: boolean; message: string; planId?: string; paymentId?: string }> => {
  const { id: branchId } = await getBranchConfig();
  try {
    // 1. Extract and validate time
    const timeString = extractTimeString(planData.joiningDate);
    const parseResult = planSchema.safeParse({ ...planData, joiningTime: timeString });

    if (!parseResult.success) {
      return { error: true, message: 'Invalid plan data' };
    }

    // 2. Find existing plan (if any)
    const existingPlan = await findExistingPlanInDB(planData.id, planData.clientId);
    const planCode = existingPlan?.planCode || (await getNextPlanCode(branchId));

    // 3. Check if plan has changed
    const planTimingChanged = existingPlan
      ? hasPlanChanged(existingPlan, planData.joiningDate, timeString, planData)
      : false;

    // 4. Get vehicle details for payment calculation
    const vehicle = await getVehicleRentAmount(planData.vehicleId);

    if (!vehicle) {
      return { error: true, message: 'Vehicle not found' };
    }

    // 5. Calculate payment breakdown
    const paymentBreakdown = calculateEnrollmentPaymentBreakdown({
      sessions: planData.numberOfSessions,
      duration: planData.sessionDurationInMinutes,
      rate: vehicle.rent,
      discount: paymentData.discount,
      paymentType: paymentData.paymentType,
      licenseServiceFee: paymentData.licenseServiceFee,
    });

    // 6. Validate payment data with calculated total
    const validationResult = paymentSchema.safeParse({
      ...paymentData,
      branchId,
      totalAmount: paymentBreakdown.totalAmountAfterDiscount,
    });

    if (!validationResult.success) {
      console.error('[createPlanWithPayment] Validation failed:', validationResult.error.format());
      return { error: true, message: 'Invalid payment data' };
    }

    // 7. Prepare plan data for database
    const planDataForDB = {
      ...parseResult.data,
      joiningDate: dateToString(planData.joiningDate),
      joiningTime: timeString,
      branchId,
      vehicleRentAmount: vehicle.rent,
      planCode,
    };

    // 8. Persist plan and payment to database in a transaction
    const { plan } = await upsertPlanAndPaymentInDB(planDataForDB, validationResult.data);

    // 9. Process immediate payment transactions
    const paymentMode = validationResult.data.paymentMode;
    if (IMMEDIATE_PAYMENT_MODES.includes(paymentMode as (typeof IMMEDIATE_PAYMENT_MODES)[number])) {
      await processPaymentTransaction(
        plan.paymentId!,
        paymentMode as 'CASH' | 'QR',
        validationResult.data.paymentType,
        paymentBreakdown.firstInstallmentAmount,
        paymentBreakdown.secondInstallmentAmount
      );
    }

    // 10. Handle session generation/update
    const sessionMessage = await handleSessionGeneration(
      planData.clientId,
      plan.id,
      {
        joiningDate: planData.joiningDate,
        joiningTime: timeString,
        numberOfSessions: planData.numberOfSessions,
        vehicleId: planData.vehicleId,
      },
      planTimingChanged
    );

    return {
      error: false,
      message: `Plan and payment acknowledged successfully${sessionMessage}`,
      planId: plan.id,
      paymentId: plan.paymentId!,
    };
  } catch (error) {
    console.error('Error processing plan and payment data:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to save plan and payment information';
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
  data: z.infer<typeof clientSchema>
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

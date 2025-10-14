'use server';

import { z } from 'zod';
import {
  LearningLicenseValues,
  DrivingLicenseValues,
  PlanValues,
  planSchema,
  PaymentValues,
} from '../types';
import { getBranchConfig } from '@/server/action/branch';
import { ActionReturnType } from '@/types/actions';
import {
  upsertClientInDB,
  upsertLearningLicenseInDB,
  upsertDrivingLicenseInDB,
  findExistingPlanInDB,
  upsertPlanWithPaymentIdInDB,
  getVehicleRentAmount,
} from './db';
import { formatDateToYYYYMMDD, formatTimeString } from '@/lib/date-time-utils';
import { clientSchema } from '@/types/zod/client';
import { calculateEnrollmentPaymentBreakdown } from '@/lib/payment/calculate';
import { drivingLicenseSchema, learningLicenseSchema } from '@/types/zod/license';
import { hasPlanChanged, handleSessionGeneration } from '../lib/plan-helpers';
import { getNextPlanCode } from '@/db/utils/plan-code';
import { getNextClientCode } from '@/db/utils/client-code';
import { upsertPaymentWithOptionalTransaction } from '@/server/action/payments';

export const upsertClient = async (
  unsafeData: z.infer<typeof clientSchema>
): Promise<{ error: boolean; message: string } & { clientId?: string }> => {
  try {
    const { id: branchId, tenantId } = await getBranchConfig();
    const { success, data, error } = clientSchema.safeParse({
      ...unsafeData,
      id: unsafeData.id, // Pass the client ID if editing
      branchId,
      tenantId,
    });

    if (!success) {
      console.error('Invalid client data:', error);
      return { error: true, message: 'Invalid client data' };
    }

    const birthDateString = formatDateToYYYYMMDD(data.birthDate);
    const clientCode = data.clientCode ?? (await getNextClientCode(tenantId));

    const { clientId } = await upsertClientInDB({
      ...data,
      branchId,
      tenantId,
      clientCode,
      birthDate: birthDateString, // Convert to YYYY-MM-DD string
    });

    return {
      error: false,
      message: 'Success',
      clientId,
    };
  } catch (error) {
    console.error('Error creating client:', error);
    return { error: true, message: 'Failed to create client' };
  }
};

export const upsertLearningLicense = async (
  unsafeData: LearningLicenseValues
): ActionReturnType => {
  try {
    // Validate the learning license data
    const { success, data } = learningLicenseSchema.safeParse(unsafeData);

    if (!success) {
      return { error: true, message: 'Invalid learning licence data' };
    }

    // Ensure clientId is present for database operation
    if (!data.clientId) {
      return { error: true, message: 'Client ID is required' };
    }

    const learningLicenseData = {
      ...data,
      clientId: data.clientId,
      // Convert date fields to YYYY-MM-DD strings
      testConductedOn: data.testConductedOn ? formatDateToYYYYMMDD(data.testConductedOn) : null,
      issueDate: data.issueDate ? formatDateToYYYYMMDD(data.issueDate) : null,
      expiryDate: data.expiryDate ? formatDateToYYYYMMDD(data.expiryDate) : null,
    };

    // Create or update the learning license
    await upsertLearningLicenseInDB(learningLicenseData);

    return {
      error: false,
      message: 'Success',
    };
  } catch (error) {
    console.error('Error processing learning license data:', error);
    return { error: true, message: 'Failed to save learning licence information' };
  }
};

export const upsertDrivingLicense = async (unsafeData: DrivingLicenseValues): ActionReturnType => {
  try {
    // Validate the driving license data
    const { success, data } = drivingLicenseSchema.safeParse(unsafeData);

    if (!success) {
      return {
        error: true,
        message: 'Invalid driving licence data',
      };
    }

    // Ensure clientId is present for database operation
    if (!data.clientId) {
      return { error: true, message: 'Client ID is required' };
    }

    const drivingLicenseData = {
      ...data,
      clientId: data.clientId,
      // Convert date fields to YYYY-MM-DD strings
      appointmentDate: data.appointmentDate ? formatDateToYYYYMMDD(data.appointmentDate) : null,
      issueDate: data.issueDate ? formatDateToYYYYMMDD(data.issueDate) : null,
      expiryDate: data.expiryDate ? formatDateToYYYYMMDD(data.expiryDate) : null,
    };

    // Create or update the driving license
    await upsertDrivingLicenseInDB(drivingLicenseData);

    return {
      error: false,
      message: 'Driving licence created successfully',
    };
  } catch {
    return { error: true, message: 'Failed to save driving licence information' };
  }
};

export const upsertPlanWithPayment = async (
  unsafePlanData: PlanValues,
  unsafePaymentData: PaymentValues
): Promise<{ error: boolean; message: string; planId?: string; paymentId?: string }> => {
  const branchConfig = await getBranchConfig();
  const { id: branchId } = branchConfig;
  try {
    // 1. Extract and validate time
    const joiningTime = formatTimeString(unsafePlanData.joiningDate);
    const joiningDate = formatDateToYYYYMMDD(unsafePlanData.joiningDate);

    // 2. Parallelize independent database queries
    const [existingPlan, vehicle] = await Promise.all([
      findExistingPlanInDB(unsafePlanData.id, unsafePlanData.clientId),
      getVehicleRentAmount(unsafePlanData.vehicleId),
    ]);

    // 3. Check if plan has changed
    const planTimingChanged = hasPlanChanged(
      existingPlan,
      joiningDate,
      joiningTime,
      unsafePlanData
    );

    // 4. Validate vehicle exists
    if (!vehicle) {
      return { error: true, message: 'Vehicle not found' };
    }

    // 5. Calculate total amount using the shared calculation function
    const { totalAmountAfterDiscount } = calculateEnrollmentPaymentBreakdown({
      sessions: unsafePlanData.numberOfSessions,
      duration: unsafePlanData.sessionDurationInMinutes,
      rate: vehicle.rent,
      discount: unsafePaymentData.discount || 0,
      paymentType: unsafePaymentData.paymentType,
      licenseServiceFee: unsafePaymentData.licenseServiceFee || 0,
    });

    // 6. Prepare and validate plan data
    const _planData = {
      ...unsafePlanData,
      branchId,
      vehicleRentAmount: vehicle.rent,
    };

    const {
      success: planSuccess,
      data: planDataWithoutFormattedDateTime,
      error: planError,
    } = planSchema.safeParse(_planData);

    if (!planSuccess) {
      console.error('Invalid plan data:', planError);
      return { error: true, message: 'Invalid plan data' };
    }

    const planData = {
      ...planDataWithoutFormattedDateTime,
      joiningDate,
      joiningTime,
    };

    // 7. Create/update payment using shared function
    const paymentResult = await upsertPaymentWithOptionalTransaction({
      payment: {
        ...unsafePaymentData,
        id: existingPlan?.paymentId,
        clientId: unsafePlanData.clientId,
        branchId,
        totalAmount: totalAmountAfterDiscount,
      },
      processTransaction: false,
    });

    if (paymentResult.error || !paymentResult.payment) {
      return {
        error: true,
        message: paymentResult.message,
      };
    }

    // 8. Generate plan code if creating new plan
    const planCode = unsafePlanData.planCode ?? (await getNextPlanCode(branchId));

    // 9. Create/update plan with paymentId
    const { plan } = await upsertPlanWithPaymentIdInDB({
      ...planData,
      planCode,
      paymentId: paymentResult.payment.id,
    });

    // 10. Generate sessions
    await handleSessionGeneration(
      planData.clientId,
      plan.id,
      {
        joiningDate: planDataWithoutFormattedDateTime.joiningDate,
        joiningTime,
        numberOfSessions: planData.numberOfSessions,
        vehicleId: planData.vehicleId,
      },
      planTimingChanged,
      branchConfig
    );

    return {
      error: false,
      message: 'Plan and payment processed successfully',
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

export const getClientById = async (
  clientId: string
): Promise<
  { error: boolean; message: string } & { data?: Awaited<ReturnType<typeof getClientByIdFromDB>> }
> => {
  if (!clientId) {
    return { error: true, message: 'Client ID is required' };
  }

  try {
    const client = await getClientByIdFromDB(clientId);

    if (!client) {
      return { error: true, message: 'Client not found' };
    }

    return {
      error: false,
      message: 'Client data retrieved successfully',
      data: client,
    };
  } catch {
    return { error: true, message: 'Failed to fetch client data' };
  }
};

async function processPaymentTransaction(
  paymentId: string,
  paymentMode: 'CASH' | 'QR',
  paymentType: string,
  totalAmount: number
): Promise<void> {
  if (paymentType === 'FULL_PAYMENT') {
    await handleFullPayment(paymentId, paymentMode);
  } else if (paymentType === 'INSTALLMENTS') {
    await handleInstallmentPayment(paymentId, paymentMode, totalAmount);
  }
}

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

export async function createPaymentLinkAndSendWhatsApp(
  request: CreatePaymentLinkRequest & { clientId: string }
): Promise<PaymentLinkResult> {
  try {
    // 1. Create the payment link
    const paymentLinkResult = await createPaymentLink(request);

    if (!paymentLinkResult.success || !paymentLinkResult.data) {
      return paymentLinkResult;
    }

    // 2. Send WhatsApp message with the payment link
    try {
      await sendOnboardingMessageAfterPayment({
        clientId: request.clientId,
        planId: request.planId,
        paymentMode: 'PAYMENT_LINK',
        amount: request.amount,
        transactionReference: paymentLinkResult.data.paymentUrl,
      });
    } catch (whatsappError) {
      console.error('Failed to send WhatsApp message:', whatsappError);
      // Don't fail the whole operation if WhatsApp fails
    }

    return paymentLinkResult;
  } catch (error) {
    console.error('❌ [Create Payment Link & WhatsApp] Error:', error);
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

export const updatePayment = async (
  unsafeData: z.infer<typeof paymentSchema>
): Promise<{ error: boolean; message: string; paymentId?: string }> => {
  try {
    const { id: branchId } = await getBranchConfig();
    const { success, data, error } = paymentSchema.safeParse({
      ...unsafeData,
      branchId,
    });

    if (!success) {
      console.log(error);
      return { error: true, message: 'Invalid payment data' };
    }

    // 4. Persist payment to database
    const { payment } = await updatePaymentInDB(data);

    return {
      error: false,
      message: 'Payment acknowledged successfully',
      paymentId: payment?.id,
    };
  } catch (error) {
    console.error('Error processing payment data:', error);
    const message = error instanceof Error ? error.message : 'Failed to save payment information';
    return { error: true, message };
  }
};

export const updatePaymentAndProcessTransaction = async (
  unsafeData: z.infer<typeof paymentSchema>
): Promise<{ error: boolean; message: string; paymentId?: string }> => {
  try {
    const { id: branchId } = await getBranchConfig();
    const { success, data, error } = paymentSchema.safeParse({
      ...unsafeData,
      branchId,
    });

    if (!success) {
      console.log(error);
      return { error: true, message: 'Invalid payment data' };
    }

    // 4. Persist payment to database
    const { payment } = await updatePaymentInDB(data);

    if (payment?.id) {
      // 5. Process immediate payment transactions
      const paymentMode = data.paymentMode;

      if (
        IMMEDIATE_PAYMENT_MODES.includes(paymentMode as (typeof IMMEDIATE_PAYMENT_MODES)[number])
      ) {
        await processPaymentTransaction(
          payment.id,
          paymentMode as 'CASH' | 'QR',
          data.paymentType,
          payment.totalAmount
        );
      }
    }

    return {
      error: false,
      message: 'Payment acknowledged successfully',
      paymentId: payment?.id,
    };
  } catch (error) {
    console.error('Error processing payment data:', error);
    const message = error instanceof Error ? error.message : 'Failed to save payment information';
    return { error: true, message };
  }
};

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
  deleteClientInDB,
} from './db';
import { formatDateToYYYYMMDD, formatTimeString } from '@/lib/date-time-utils';
import { clientSchema } from '@/types/zod/client';
import { calculateEnrollmentPaymentBreakdown } from '@/lib/payment/calculate';
import { drivingLicenseSchema, learningLicenseSchema } from '@/types/zod/license';
import { hasPlanChanged, handleSessionGeneration } from '../lib/plan-helpers';
import { getNextPlanCode } from '@/db/utils/plan-code';
import { getNextClientCode } from '@/db/utils/client-code';
import { upsertPaymentWithOptionalTransaction } from '@/server/action/payments';
import { getAadhaarPdfUrlByPhoneNumber } from '@/server/db/digilocker-verifications';
import { saveAadhaarDocument } from '@/server/db/client-documents';

export const upsertClient = async (
  unsafeData: z.infer<typeof clientSchema>,
  aadhaarPdfUrl?: string
): Promise<{ error: boolean; message: string } & { clientId?: string }> => {
  try {
    const { id: branchId, tenantId } = await getBranchConfig();
    const { success, data, error } = clientSchema.safeParse({
      ...unsafeData,
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

    // If client was created (not updated), save Aadhaar document if provided
    if (clientId && !data.id) {
      try {
        // First priority: use the provided aadhaarPdfUrl from form
        let urlToSave = aadhaarPdfUrl;

        // Fallback: if not provided in form, check DigilockerVerificationTable by phone
        if (!urlToSave && data.phoneNumber) {
          const fetchedUrl = await getAadhaarPdfUrlByPhoneNumber(data.phoneNumber, tenantId);
          urlToSave = fetchedUrl ?? undefined;
        }

        if (urlToSave) {
          await saveAadhaarDocument(clientId, urlToSave);
        }
      } catch (docError) {
        console.error('Error saving Aadhaar document:', docError);
        // Don't fail the entire operation if document save fails
      }
    }

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
    console.log('DEBUG: unsafePlanData.joiningDate =', unsafePlanData.joiningDate);
    console.log('DEBUG: joiningDate ISO string =', unsafePlanData.joiningDate.toISOString());
    console.log('DEBUG: joiningDate local string =', unsafePlanData.joiningDate.toString());
    const joiningTime = formatTimeString(unsafePlanData.joiningDate);
    const joiningDate = formatDateToYYYYMMDD(unsafePlanData.joiningDate);
    console.log('DEBUG: Extracted joiningTime =', joiningTime);
    console.log('DEBUG: Extracted joiningDate =', joiningDate);

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

export const softDeleteClient = async (clientId: string): ActionReturnType => {
  try {
    if (!clientId) {
      return { error: true, message: 'Client ID is required' };
    }

    await deleteClientInDB(clientId);

    return {
      error: false,
      message: 'Enrollment discarded successfully',
    };
  } catch (error) {
    console.error('Error soft deleting client:', error);
    return { error: true, message: 'Failed to discard enrollment' };
  }
};

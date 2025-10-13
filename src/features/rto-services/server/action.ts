'use server';

import { z } from 'zod';
import { deleteRTOService as deleteRTOServiceInDB, saveRTOServiceAndPaymentInDB } from './db';
import { ActionReturnType } from '@/types/actions';
import { getBranchConfig } from '@/server/action/branch';
import { getNextClientCode } from '@/db/utils/client-code';
import { rtoServicesFormSchema, rtoServicesFormSchemaWithOptionalPayment } from '../types';
import { formatDateToYYYYMMDD } from '@/lib/date-time-utils';
import { getRTOServiceCharges } from '@/lib/constants/rto-fees';
import { paymentSchema } from '@/types/zod/payment';
import { calculateRTOPaymentBreakdown } from '@/lib/payment/calculate';
import { IMMEDIATE_PAYMENT_MODES } from '@/lib/constants/payment';
import { upsertFullPaymentInDB } from '@/server/db/payments';

/**
 * Server action to delete an RTO service
 */
export async function deleteRTOService(id: string): ActionReturnType {
  try {
    const { id: branchId } = await getBranchConfig();

    await deleteRTOServiceInDB(id, branchId);

    return {
      error: false,
      message: 'RTO service deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting RTO service:', error);
    return {
      error: true,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

export const saveRTOServiceWithPayment = async (
  unsafeData: z.infer<typeof rtoServicesFormSchema>
): Promise<{
  clientId?: string;
  serviceId?: string;
  paymentId?: string;
  error: boolean;
  message: string;
}> => {
  try {
    const {
      tenantId,
      id: branchId,
      licenseServiceCharge: branchServiceCharge,
    } = await getBranchConfig();

    const { governmentFees, additionalCharges } = getRTOServiceCharges(unsafeData.service.type);

    // Calculate payment amounts for validation
    const paymentBreakdown = calculateRTOPaymentBreakdown({
      governmentFees,
      serviceCharge: additionalCharges,
      branchServiceCharge,
      discount: unsafeData.payment.discount,
    });

    // Validate everything at once
    const { success, data, error } = rtoServicesFormSchemaWithOptionalPayment.safeParse(unsafeData);

    if (!success) {
      console.error('Validation error:', error);
      return {
        error: true,
        message: 'Invalid data',
      };
    }

    const _paymentData = {
      ...unsafeData.payment,
      branchId,
      totalAmount: paymentBreakdown.totalAmountAfterDiscount,
      licenseServiceFee: paymentBreakdown.branchServiceCharge,
    };

    const {
      success: paymentSuccess,
      data: paymentData,
      error: paymentError,
    } = paymentSchema
      .extend({
        clientId: z.string().optional(),
      })
      .safeParse(_paymentData);

    if (!paymentSuccess) {
      console.error('Validation error:', paymentError);
      return {
        error: true,
        message: 'Invalid data',
      };
    }

    // Prepare RTO service data
    const serviceData = {
      ...data.service,
      branchId,
      serviceType: data.service.type,
      governmentFees,
      serviceCharge: additionalCharges,
    };

    // Prepare client information
    const clientCode = data.client.clientCode ?? (await getNextClientCode(tenantId));

    const clientInformation = {
      ...data.client,
      clientCode,
      birthDate: formatDateToYYYYMMDD(data.client.birthDate),
      branchId,
      tenantId,
    };

    // Save RTO service and payment in a transaction
    const { clientId, serviceId, paymentId } = await saveRTOServiceAndPaymentInDB(
      clientInformation,
      serviceData,
      {
        ...paymentData,
        branchId,
      }
    );

    // Process immediate payment if needed
    const currentDate = formatDateToYYYYMMDD(new Date());
    const paymentMode = paymentData.paymentMode;

    if (IMMEDIATE_PAYMENT_MODES.includes(paymentMode as (typeof IMMEDIATE_PAYMENT_MODES)[number])) {
      await upsertFullPaymentInDB({
        paymentId,
        paymentMode,
        paymentDate: currentDate,
        isPaid: true,
      });
    }

    return {
      error: false,
      message: 'RTO service and payment saved successfully',
      clientId,
      serviceId,
      paymentId,
    };
  } catch (error) {
    console.error('Error saving RTO service with payment:', error);
    return {
      error: true,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
};

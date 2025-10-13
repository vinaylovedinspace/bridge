'use server';

import { z } from 'zod';
import {
  deleteRTOService as deleteRTOServiceInDB,
  getRTOService,
  upsertPaymentInDB,
  saveRTOServiceAndPaymentInDB,
} from './db';
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

export const upsertPayment = async (
  unsafeData: z.infer<typeof paymentSchema>,
  serviceId: string
) => {
  try {
    // 1. Get RTO service to get clientId and service charges
    const rtoService = await getRTOService(serviceId);

    if (!rtoService) {
      return { error: true, message: 'RTO service not found', payment: undefined };
    }

    // 2. Get branch config for service charge
    const { licenseServiceCharge: branchServiceCharge, id: branchId } = await getBranchConfig();

    // 3. Calculate payment amounts using shared function (ensures consistency with frontend)
    const paymentBreakdown = calculateRTOPaymentBreakdown({
      governmentFees: rtoService.governmentFees,
      serviceCharge: rtoService.serviceCharge,
      branchServiceCharge: branchServiceCharge,
      discount: unsafeData.discount,
    });

    // 4. Validate payment data with calculated amounts
    const { success, data, error } = paymentSchema.safeParse({
      ...unsafeData,
      branchId,
      clientId: rtoService.clientId,
      totalAmount: paymentBreakdown.totalAmountAfterDiscount,
      licenseServiceFee: paymentBreakdown.branchServiceCharge,
    });

    if (!success) {
      console.error('Payment validation error:', error);
      return { error: true, message: 'Invalid payment data', payment: undefined };
    }

    // 5. Create or update payment
    const payment = await upsertPaymentInDB(data, serviceId);

    const currentDate = formatDateToYYYYMMDD(new Date());

    if (
      IMMEDIATE_PAYMENT_MODES.includes(data.paymentMode as (typeof IMMEDIATE_PAYMENT_MODES)[number])
    ) {
      const updatedPayment = await upsertFullPaymentInDB({
        paymentId: payment.id,
        paymentMode: data.paymentMode,
        paymentDate: currentDate,
        isPaid: true,
      });

      return {
        error: false,
        message: 'Payment acknowledged successfully',
        payment: updatedPayment,
      };
    }

    return {
      error: false,
      message: 'Payment acknowledged successfully',
      payment,
    };
  } catch (error) {
    console.error('Error processing payment data:', error);
    const message = error instanceof Error ? error.message : 'Failed to save payment information';
    return { error: true, message, payment: undefined };
  }
};

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
      paymentData
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

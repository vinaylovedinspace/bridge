'use server';

import { z } from 'zod';
import { getBranchConfig } from '@/server/action/branch';
import { paymentSchema } from '@/types/zod/payment';
import { IMMEDIATE_PAYMENT_MODES } from '@/lib/constants/payment';
import { formatDateToYYYYMMDD } from '@/lib/date-time-utils';
import { upsertFullPaymentInDB } from '@/server/db/payments';
import { upsertPaymentInDB } from '@/server/db/payments';
import {
  preparePaymentReference,
  cancelExistingPendingTransaction,
  createTransactionRecord,
} from '@/lib/payment/payment-link-helpers';
import { env } from '@/env';
import { StandardCheckoutClient, Env, StandardCheckoutPayRequest } from 'pg-sdk-node';

export type PaymentLinkResult = {
  success: boolean;
  data?: {
    linkId: string;
    paymentUrl: string;
    qrCode: string;
    expiryTime?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'PAID' | 'EXPIRED';
    amountPaid?: number;
  };
  referenceId?: string; // Reference ID for polling transactions
  error?: string;
};

export type CreatePaymentLinkRequest = {
  amount: number;
  customerPhone: string;
  customerName: string;
  customerEmail?: string;
  paymentId: string;
  paymentType: 'FULL_PAYMENT' | 'INSTALLMENTS';
  type: 'enrollment' | 'rto-service';
  sendSms?: boolean;
  sendEmail?: boolean;
  expiryInDays?: number;
  enablePartialPayments?: boolean;
  minimumPartialAmount?: number;
};

type UpsertPaymentOptions = {
  payment: z.infer<typeof paymentSchema>;
  processTransaction?: boolean;
};

type UpsertPaymentResult = {
  error: boolean;
  message: string;
  payment?: Awaited<ReturnType<typeof upsertPaymentInDB>>;
};

/**
 * Shared function to upsert payment with optional transaction processing
 * Used by both enrollment and RTO services
 */
export async function upsertPaymentWithOptionalTransaction({
  payment: unsafeData,
  processTransaction = false,
}: UpsertPaymentOptions): Promise<UpsertPaymentResult> {
  try {
    const { id: branchId } = await getBranchConfig();
    const { success, data, error } = paymentSchema.safeParse({
      ...unsafeData,
      branchId,
    });

    if (!success) {
      console.error('Payment validation error:', error);
      return { error: true, message: 'Invalid payment data', payment: undefined };
    }

    // Persist payment to database
    const payment = await upsertPaymentInDB({
      ...data,
      branchId: data.branchId!,
    });

    // Process immediate payment transactions if requested
    if (
      processTransaction &&
      IMMEDIATE_PAYMENT_MODES.includes(data.paymentMode as (typeof IMMEDIATE_PAYMENT_MODES)[number])
    ) {
      const currentDate = formatDateToYYYYMMDD(new Date());

      if (data.paymentType === 'FULL_PAYMENT') {
        const updatedPayment = await upsertFullPaymentInDB({
          paymentId: payment.id,
          paymentMode: data.paymentMode,
          paymentDate: currentDate,
          isPaid: true,
        });

        return {
          error: false,
          message: 'Payment processed successfully',
          payment: updatedPayment,
        };
      } else if (data.paymentType === 'INSTALLMENTS') {
        // Import dynamically to avoid circular dependencies
        const { handleInstallmentPayment } = await import(
          '@/features/enrollment/lib/payment-helpers'
        );
        const updatedPayment = await handleInstallmentPayment(
          payment.id,
          data.paymentMode,
          data.totalAmount
        );

        return {
          error: false,
          message: 'Payment processed successfully',
          payment: updatedPayment,
        };
      }
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
}

// Initialize PhonePe client (singleton)
function getPhonePeClient() {
  const phonepeEnv = env.PHONEPE_ENV === 'PRODUCTION' ? Env.PRODUCTION : Env.SANDBOX;

  return StandardCheckoutClient.getInstance(
    env.PHONEPE_CLIENT_ID,
    env.PHONEPE_CLIENT_SECRET,
    env.PHONEPE_CLIENT_VERSION,
    phonepeEnv
  );
}

export const createPhonePePaymentLinkAction = async (request: CreatePaymentLinkRequest) => {
  // Prepare payment reference (handles both full payment and installments)
  const { referenceId, installmentNumber } = await preparePaymentReference(
    request.paymentId,
    request.paymentType,
    request.amount
  );

  // Cancel existing pending transaction if any
  await cancelExistingPendingTransaction(referenceId);

  const phonepe = getPhonePeClient();

  // Generate unique merchant transaction ID
  const merchantTransactionId = `${referenceId}_${Date.now()}`;

  try {
    // Build payment request using official SDK
    const paymentRequest = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantTransactionId)
      .amount(request.amount * 100) // Convert rupees to paise
      .redirectUrl(`${env.NEXT_PUBLIC_APP_URL}/payment/redirect`)
      .build();

    const response = await phonepe.pay(paymentRequest);

    const paymentUrl = response.redirectUrl || '';

    // Create transaction record to track the payment link
    await createTransactionRecord({
      paymentId: request.paymentId,
      amount: request.amount,
      referenceId,
      installmentNumber,
      paymentLinkId: merchantTransactionId,
      paymentLinkUrl: paymentUrl,
      paymentLinkStatus: 'ACTIVE',
      paymentLinkExpiresAt: null, // PhonePe doesn't provide explicit expiry
      paymentLinkCreatedAt: new Date(),
      metadata: {
        merchantTransactionId,
        paymentType: request.paymentType,
        type: request.type,
      },
    });

    return {
      success: true,
      data: {
        linkId: merchantTransactionId,
        paymentUrl,
        qrCode: '', // PhonePe SDK doesn't return QR in pay response
        status: 'ACTIVE' as const,
      },
      referenceId,
    };
  } catch (error) {
    console.error('Error creating PhonePe payment link:', error);
    throw error;
  }
};

export const checkPhonePePaymentStatusAction = async (merchantTransactionId: string) => {
  const phonepe = getPhonePeClient();

  try {
    const response = await phonepe.getOrderStatus(merchantTransactionId);

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error('Error checking PhonePe payment status:', error);
    throw error;
  }
};

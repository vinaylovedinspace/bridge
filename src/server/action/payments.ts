'use server';

import { z } from 'zod';
import { unstable_cache } from 'next/cache';
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
import { SetuCreateDQRResponse, SetuGetDQRResponse } from '@/types/setu';

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

// Cached Setu access token fetcher with Next.js unstable_cache
const _getCachedSetuAccessToken = async () => {
  const authorizationResponse = await fetch('https://accountservice.setu.co/v1/users/login', {
    method: 'POST',
    headers: {
      client: 'bridge',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientID: env.SETU_API_KEY,
      secret: env.SETU_API_SECRET,
      grant_type: 'client_credentials',
    }),
  });

  const { access_token } = (await authorizationResponse.json()) as {
    access_token: string;
  };

  return access_token;
};

export const getSetuAccessTokenAction = unstable_cache(
  _getCachedSetuAccessToken,
  ['setu-access-token'],
  {
    tags: ['setu-access-token'],
    revalidate: 280,
  }
);

export const createSetuPaymentLinkAction = async (request: CreatePaymentLinkRequest) => {
  const accessToken = await getSetuAccessTokenAction();

  // Prepare payment reference (handles both full payment and installments)
  const { referenceId, installmentNumber } = await preparePaymentReference(
    request.paymentId,
    request.paymentType,
    request.amount
  );

  // Cancel existing pending transaction if any
  await cancelExistingPendingTransaction(referenceId);

  const response = await fetch(`${env.SETU_URL}/api/v1/merchants/dqr`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Merchantid: '01K4VTE5HPZEB81F0CJ2B4NZ79',
    },
    body: JSON.stringify({
      amount: request.amount,
      merchantVpa: 'setu.bridge24304@setuaxis',
      referenceId,
      metadata: {
        paymentId: request.paymentId,
        paymentType: request.paymentType,
        type: request.type,
      },
      transactionNote: `Payment for ${request.type}`,
    }),
  });

  const data = (await response.json()) as SetuCreateDQRResponse;

  // Create transaction record to track the payment link
  await createTransactionRecord({
    paymentId: request.paymentId,
    amount: request.amount,
    referenceId,
    installmentNumber,
    paymentLinkId: data.id,
    paymentLinkUrl: data.shortLink,
    paymentLinkStatus: data.status,
    paymentLinkExpiresAt: new Date(data.expiryDate),
    paymentLinkCreatedAt: new Date(data.createdAt),
    metadata: data,
  });

  return {
    success: true,
    data,
    referenceId,
  };
};

export const checkSetuPaymentLinkStatusAction = async (referenceId: string) => {
  const accessToken = await getSetuAccessTokenAction();

  const response = await fetch(`${env.SETU_URL}/api/v1/merchants/dqr/${referenceId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Merchantid: '01K4VTE5HPZEB81F0CJ2B4NZ79',
    },
  });

  const data = (await response.json()) as SetuGetDQRResponse;

  return {
    success: true,
    data,
  };
};

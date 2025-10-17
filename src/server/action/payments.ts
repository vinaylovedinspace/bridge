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
import Razorpay from 'razorpay';
import { env } from '@/env';
import { db } from '@/db';
import { TransactionTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
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

export async function createPaymentLinkAction(request: CreatePaymentLinkRequest) {
  const instance = new Razorpay({
    key_id: env.RAZORPAY_API_KEY,
    key_secret: env.RAZORPAY_API_SECRET,
  });

  // Prepare payment reference (handles both full payment and installments)
  const { referenceId, installmentId, installmentNumber } = await preparePaymentReference(
    request.paymentId,
    request.paymentType,
    request.amount
  );

  // Cancel existing pending transaction if any
  const existingTransaction = await cancelExistingPendingTransaction(referenceId);

  // If an existing pending transaction exists, try to cancel it in Razorpay
  if (existingTransaction?.paymentLinkId) {
    try {
      // Check payment link status before attempting to cancel
      const linkStatus = await instance.paymentLink.fetch(existingTransaction.paymentLinkId);

      // Only cancel if not already paid
      if (linkStatus.status !== 'paid') {
        await instance.paymentLink.cancel(existingTransaction.paymentLinkId);
        console.log(`Cancelled old payment link: ${existingTransaction.paymentLinkId}`);
      } else {
        console.log(
          `Payment link already paid, cannot cancel: ${existingTransaction.paymentLinkId}`
        );
      }
    } catch (error) {
      console.warn(
        `Could not cancel old payment link: ${existingTransaction.paymentLinkId}`,
        error
      );
    }
  }

  // Create new payment link with metadata in notes
  const paymentLink = await instance.paymentLink.create({
    amount: request.amount * 100,
    currency: 'INR',
    reference_id: referenceId,
    description: `Payment for ${request.type}`,
    notes: {
      payment_id: request.paymentId,
      payment_type: request.paymentType,
      type: request.type,
      ...(installmentId && { installment_id: installmentId }),
    },
    customer: {
      name: request.customerName,
      email: request.customerEmail,
      contact: request.customerPhone,
    },
    notify: {
      sms: request.sendSms ?? true,
    },
  });

  // Create new transaction record to track the payment link
  await createTransactionRecord({
    paymentId: request.paymentId,
    amount: request.amount,
    paymentGateway: 'RAZORPAY',
    referenceId,
    installmentNumber,
    paymentLinkId: paymentLink.id,
    paymentLinkUrl: paymentLink.short_url,
    paymentLinkStatus: paymentLink.status,
    paymentLinkExpiresAt: paymentLink.expire_by
      ? new Date(Number(paymentLink.expire_by) * 1000)
      : null,
    paymentLinkCreatedAt: paymentLink.created_at
      ? new Date(Number(paymentLink.created_at) * 1000)
      : new Date(),
    metadata: paymentLink,
  });

  return {
    success: true,
    data: paymentLink,
    referenceId, // Return reference ID for polling
  };
}

/**
 * Check payment link status by transaction
 * Polls the transaction table to check if the specific payment link was paid
 * Much more efficient than checking payment/installment tables
 */
export async function checkPaymentLinkStatusAction(paymentLinkReferenceId: string): Promise<{
  success: boolean;
  isPaid: boolean;
  transactionStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  paymentLinkStatus?: string;
  razorpayPaymentId?: string;
  error?: string;
}> {
  try {
    // Get the most recent transaction for this reference ID
    const transaction = await db.query.TransactionTable.findFirst({
      where: and(
        eq(TransactionTable.paymentLinkReferenceId, paymentLinkReferenceId),
        eq(TransactionTable.paymentMode, 'PAYMENT_LINK')
      ),
      orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
    });

    if (!transaction) {
      return {
        success: false,
        isPaid: false,
        transactionStatus: 'PENDING',
        error: 'Transaction not found',
      };
    }

    // Check if the transaction is successful
    const isPaid = transaction.transactionStatus === 'SUCCESS';

    return {
      success: true,
      isPaid,
      transactionStatus: transaction.transactionStatus,
      paymentLinkStatus: transaction.paymentLinkStatus || undefined,
      razorpayPaymentId: transaction.razorpayPaymentId || undefined,
    };
  } catch (error) {
    console.error('Error checking payment link status:', error);
    return {
      success: false,
      isPaid: false,
      transactionStatus: 'PENDING',
      error: 'Failed to check payment link status',
    };
  }
}

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
    paymentGateway: 'SETU',
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

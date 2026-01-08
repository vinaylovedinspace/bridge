'use server';

import { z } from 'zod';
import { getBranchConfig } from '@/server/action/branch';
import { paymentSchema } from '@/types/zod/payment';
import { IMMEDIATE_PAYMENT_MODES } from '@/lib/constants/payment';
import { formatDateToYYYYMMDD } from '@/lib/date-time-utils';
import { upsertPaymentInDB } from '@/server/db/payments';
import {
  preparePaymentReference,
  cancelExistingPendingTransaction,
  createTransactionRecord,
  createManualTransactionRecord,
} from '@/lib/payment/payment-link-helpers';
import { createPhonePePayment, getPhonePeOrderStatus } from '@/lib/payment/phonepe-client';
import { env } from '@/env';

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
      const isManualPayment = data.paymentMode === 'CASH' || data.paymentMode === 'QR';

      if (data.paymentType === 'FULL_PAYMENT') {
        // Use DB transaction to ensure atomicity
        const result = await import('@/db').then(async ({ db }) => {
          return await db.transaction(async (tx) => {
            // 1. Update full payment record
            await tx
              .update((await import('@/db/schema')).FullPaymentTable)
              .set({
                paymentId: payment.id,
                paymentMode: data.paymentMode,
                paymentDate: currentDate,
                isPaid: true,
                updatedAt: new Date(),
              })
              .where(
                (await import('drizzle-orm')).eq(
                  (await import('@/db/schema')).FullPaymentTable.paymentId,
                  payment.id
                )
              );

            // 2. Update main payment status
            const [finalPayment] = await tx
              .update((await import('@/db/schema')).PaymentTable)
              .set({
                paymentStatus: 'FULLY_PAID',
                updatedAt: new Date(),
              })
              .where(
                (await import('drizzle-orm')).eq(
                  (await import('@/db/schema')).PaymentTable.id,
                  payment.id
                )
              )
              .returning();

            // 3. Create transaction record for manual payments (CASH/QR)
            if (isManualPayment) {
              await tx.insert((await import('@/db/schema')).TransactionTable).values({
                paymentId: payment.id,
                amount: data.totalAmount,
                paymentMode: data.paymentMode,
                paymentGateway: null,
                transactionStatus: 'SUCCESS',
                notes: `Manual ${data.paymentMode} payment recorded`,
                installmentNumber: null,
                txnDate: new Date(),
                metadata: {
                  recordedAt: new Date().toISOString(),
                  paymentType: data.paymentType,
                },
              });
            }

            return finalPayment;
          });
        });

        return {
          error: false,
          message: 'Payment processed successfully',
          payment: result,
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

        // Create transaction record for manual installment payments (CASH/QR) in separate transaction
        if (isManualPayment) {
          await import('@/db').then(async ({ db }) => {
            // Determine which installment was just paid
            const installments = await db.query.InstallmentPaymentTable.findMany({
              where: (table, { eq }) => eq(table.paymentId, payment.id),
            });

            const paidInstallments = installments.filter((inst) => inst.isPaid);
            const lastPaidInstallment = paidInstallments[paidInstallments.length - 1];

            if (lastPaidInstallment && (data.paymentMode === 'CASH' || data.paymentMode === 'QR')) {
              await createManualTransactionRecord({
                paymentId: payment.id,
                amount: lastPaidInstallment.amount,
                paymentMode: data.paymentMode,
                installmentNumber: lastPaidInstallment.installmentNumber,
                paymentType: data.paymentType,
              });
            }
          });
        }

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

export const createPhonePePaymentLinkAction = async (request: CreatePaymentLinkRequest) => {
  // Prepare payment reference (handles both full payment and installments)
  const { referenceId, installmentNumber } = await preparePaymentReference(
    request.paymentId,
    request.paymentType,
    request.amount
  );

  // Cancel existing pending transaction if any
  await cancelExistingPendingTransaction(referenceId);

  // Generate unique merchant transaction ID
  const merchantTransactionId = `${referenceId}_${Date.now()}`;

  try {
    // Create payment using direct API
    const response = await createPhonePePayment({
      merchantOrderId: merchantTransactionId,
      amount: request.amount, // Function handles conversion to paise
      redirectUrl: `${env.NEXT_PUBLIC_APP_URL}/payment/redirect`,
    });

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
      paymentType: request.paymentType,
      type: request.type,
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
  try {
    const response = await getPhonePeOrderStatus(merchantTransactionId);

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.error('Error checking PhonePe payment status:', error);
    throw error;
  }
};

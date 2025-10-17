'use server';

import { z } from 'zod';
import { getBranchConfig } from '@/server/action/branch';
import { paymentSchema } from '@/types/zod/payment';
import { IMMEDIATE_PAYMENT_MODES } from '@/lib/constants/payment';
import { formatDateToYYYYMMDD } from '@/lib/date-time-utils';
import { upsertFullPaymentInDB } from '@/server/db/payments';
import { upsertPaymentInDB } from '@/server/db/payments';
import Razorpay from 'razorpay';
import { env } from '@/env';
import { db } from '@/db';
import {
  FullPaymentTable,
  InstallmentPaymentTable,
  TransactionTable,
  PaymentTable,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

  let referenceId = request.paymentId;
  let installmentId: string | undefined;
  let installmentNumber: number | null = null;

  // For FULL_PAYMENT, create the full payment entry first and use its ID as reference
  if (request.paymentType === 'FULL_PAYMENT') {
    const [fullPaymentEntry] = await db
      .insert(FullPaymentTable)
      .values({
        paymentId: request.paymentId,
        isPaid: false,
      })
      .onConflictDoUpdate({
        target: FullPaymentTable.paymentId,
        set: {
          isPaid: false,
          updatedAt: new Date(),
        },
      })
      .returning();

    referenceId = fullPaymentEntry.id;
  } else if (request.paymentType === 'INSTALLMENTS') {
    // For INSTALLMENTS, find the first unpaid installment and use its ID as reference
    const installments = await db.query.InstallmentPaymentTable.findMany({
      where: eq(InstallmentPaymentTable.paymentId, request.paymentId),
    });

    let unpaidInstallment = installments.find((inst) => !inst.isPaid);

    // If no unpaid installment exists, we need to create one
    if (!unpaidInstallment) {
      const paidCount = installments.filter((inst) => inst.isPaid).length;

      if (paidCount === 0) {
        // Create first installment (50% of total amount)
        const firstInstallmentAmount = Math.ceil(request.amount / 2);
        const [newInstallment] = await db
          .insert(InstallmentPaymentTable)
          .values({
            paymentId: request.paymentId,
            installmentNumber: 1,
            amount: firstInstallmentAmount,
            isPaid: false,
          })
          .returning();

        unpaidInstallment = newInstallment;
      } else if (paidCount === 1) {
        // First installment is paid, create second installment
        const firstInstallment = installments[0];
        const secondInstallmentAmount = request.amount - firstInstallment.amount;
        const [newInstallment] = await db
          .insert(InstallmentPaymentTable)
          .values({
            paymentId: request.paymentId,
            installmentNumber: 2,
            amount: secondInstallmentAmount,
            isPaid: false,
          })
          .returning();

        unpaidInstallment = newInstallment;
      } else {
        throw new Error('All installments are already paid');
      }
    }

    referenceId = unpaidInstallment.id;
    installmentId = unpaidInstallment.id;
    installmentNumber = unpaidInstallment.installmentNumber;
  }

  // Check for existing pending transaction with same reference ID
  // This handles the case where a payment link is resent
  const existingTransaction = await db.query.TransactionTable.findFirst({
    where: and(
      eq(TransactionTable.paymentLinkReferenceId, referenceId),
      eq(TransactionTable.transactionStatus, 'PENDING')
    ),
  });

  // If an existing pending transaction exists, cancel/expire the old payment link in Razorpay
  if (existingTransaction?.paymentLinkId) {
    try {
      // Attempt to cancel the old payment link in Razorpay
      await instance.paymentLink.cancel(existingTransaction.paymentLinkId);
      console.log(`Cancelled old payment link: ${existingTransaction.paymentLinkId}`);
    } catch (error) {
      // If cancellation fails (link already paid/expired), just log it
      console.warn(
        `Could not cancel old payment link: ${existingTransaction.paymentLinkId}`,
        error
      );
    }

    // Mark the old transaction as cancelled in our database
    await db
      .update(TransactionTable)
      .set({
        transactionStatus: 'CANCELLED',
        paymentLinkStatus: 'CANCELLED',
        updatedAt: new Date(),
      })
      .where(eq(TransactionTable.id, existingTransaction.id));
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
  await db.insert(TransactionTable).values({
    paymentId: request.paymentId,
    amount: request.amount,
    paymentMode: 'PAYMENT_LINK',
    paymentGateway: 'RAZORPAY',
    transactionStatus: 'PENDING',
    paymentLinkId: paymentLink.id,
    paymentLinkUrl: paymentLink.short_url,
    paymentLinkReferenceId: referenceId,
    paymentLinkStatus: paymentLink.status,
    paymentLinkExpiresAt: paymentLink.expire_by
      ? new Date(Number(paymentLink.expire_by) * 1000)
      : null,
    paymentLinkCreatedAt: paymentLink.created_at
      ? new Date(Number(paymentLink.created_at) * 1000)
      : new Date(),
    installmentNumber,
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

export async function getPaymentLinkStatusAction(linkId: string): Promise<PaymentLinkResult> {
  // TODO: Implement payment link status check
  console.log('Payment link status check requested:', linkId);
  return {
    success: false,
    error: 'Payment link status check not implemented',
  };
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

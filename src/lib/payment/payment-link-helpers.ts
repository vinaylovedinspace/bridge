import { db } from '@/db';
import * as schema from '@/db/schema';
import {
  FullPaymentTable,
  InstallmentPaymentTable,
  TransactionTable,
  PaymentTable,
} from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { formatDateToYYYYMMDD } from '@/lib/date-time-utils';
import Razorpay from 'razorpay';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { NeonQueryResultHKT } from 'drizzle-orm/neon-serverless';
import type { PaymentLinks } from 'razorpay/dist/types/paymentLink';
import { triggerPaymentNotification } from '@/lib/upstash/trigger-payment-notification';

export type PaymentReferenceResult = {
  referenceId: string;
  installmentId?: string;
  installmentNumber: number | null;
};

/**
 * Prepares payment reference IDs for creating a payment link
 * Handles both full payment and installment payment types
 */
export async function preparePaymentReference(
  paymentId: string,
  paymentType: 'FULL_PAYMENT' | 'INSTALLMENTS',
  totalAmount?: number
): Promise<PaymentReferenceResult> {
  let referenceId = paymentId;
  let installmentId: string | undefined;
  let installmentNumber: number | null = null;

  if (paymentType === 'FULL_PAYMENT') {
    const [fullPaymentEntry] = await db
      .insert(FullPaymentTable)
      .values({
        paymentId,
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
  } else if (paymentType === 'INSTALLMENTS') {
    if (!totalAmount) {
      throw new Error('Total amount is required for installment payments');
    }

    const installments = await db.query.InstallmentPaymentTable.findMany({
      where: eq(InstallmentPaymentTable.paymentId, paymentId),
    });

    let unpaidInstallment = installments.find((inst) => !inst.isPaid);

    if (!unpaidInstallment) {
      const paidCount = installments.filter((inst) => inst.isPaid).length;

      if (paidCount === 0) {
        const firstInstallmentAmount = Math.ceil(totalAmount / 2);
        const [newInstallment] = await db
          .insert(InstallmentPaymentTable)
          .values({
            paymentId,
            installmentNumber: 1,
            amount: firstInstallmentAmount,
            isPaid: false,
          })
          .returning();

        unpaidInstallment = newInstallment;
      } else if (paidCount === 1) {
        const firstInstallment = installments[0];
        const secondInstallmentAmount = totalAmount - firstInstallment.amount;
        const [newInstallment] = await db
          .insert(InstallmentPaymentTable)
          .values({
            paymentId,
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

  return {
    referenceId,
    installmentId,
    installmentNumber,
  };
}

/**
 * Cancels existing pending payment link transactions
 * Returns the cancelled transaction for gateway-specific cleanup
 */
export async function cancelExistingPendingTransaction(referenceId: string) {
  const existingTransaction = await db.query.TransactionTable.findFirst({
    where: and(
      eq(TransactionTable.paymentLinkReferenceId, referenceId),
      eq(TransactionTable.transactionStatus, 'PENDING')
    ),
  });

  if (existingTransaction) {
    await db
      .update(TransactionTable)
      .set({
        transactionStatus: 'CANCELLED',
        paymentLinkStatus: 'CANCELLED',
        updatedAt: new Date(),
      })
      .where(eq(TransactionTable.id, existingTransaction.id));
  }

  return existingTransaction;
}

/**
 * Creates a transaction record for tracking payment links
 */
export async function createTransactionRecord(params: {
  paymentId: string;
  amount: number;
  paymentGateway: 'RAZORPAY' | 'SETU';
  referenceId: string;
  installmentNumber: number | null;
  paymentLinkId: string;
  paymentLinkUrl: string;
  paymentLinkStatus?: string;
  paymentLinkExpiresAt?: Date | null;
  paymentLinkCreatedAt?: Date;
  metadata?: unknown;
}) {
  return await db.insert(TransactionTable).values({
    paymentId: params.paymentId,
    amount: params.amount,
    paymentMode: 'PAYMENT_LINK',
    paymentGateway: params.paymentGateway,
    transactionStatus: 'PENDING',
    paymentLinkId: params.paymentLinkId,
    paymentLinkUrl: params.paymentLinkUrl,
    paymentLinkReferenceId: params.referenceId,
    paymentLinkStatus: params.paymentLinkStatus,
    paymentLinkExpiresAt: params.paymentLinkExpiresAt,
    paymentLinkCreatedAt: params.paymentLinkCreatedAt ?? new Date(),
    installmentNumber: params.installmentNumber,
    metadata: params.metadata,
  });
}

// Type for transaction context
type TransactionContext = PgTransaction<
  NeonQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/**
 * Finds an existing active or pending transaction for the given reference ID
 * Excludes cancelled and failed transactions
 */
export async function findExistingTransaction(referenceId: string, gateway: 'RAZORPAY' | 'SETU') {
  return await db.query.TransactionTable.findFirst({
    where: and(
      eq(TransactionTable.paymentLinkReferenceId, referenceId),
      eq(TransactionTable.paymentGateway, gateway),
      ne(TransactionTable.transactionStatus, 'CANCELLED'),
      ne(TransactionTable.transactionStatus, 'FAILED')
    ),
    orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
  });
}

/**
 * Updates payment tables when a payment link is paid
 * Must be called within a transaction
 */
export async function markPaymentAsPaidInTransaction(
  tx: TransactionContext,
  params: {
    paymentId: string;
    paymentType: 'FULL_PAYMENT' | 'INSTALLMENTS';
    referenceId: string;
    installmentNumber: number | null;
  }
) {
  const currentDate = formatDateToYYYYMMDD(new Date());

  if (params.paymentType === 'FULL_PAYMENT') {
    // Update full payment record
    await tx
      .update(FullPaymentTable)
      .set({
        isPaid: true,
        paymentMode: 'PAYMENT_LINK',
        paymentDate: currentDate,
        updatedAt: new Date(),
      })
      .where(eq(FullPaymentTable.id, params.referenceId));

    // Update main payment status
    await tx
      .update(PaymentTable)
      .set({
        paymentStatus: 'FULLY_PAID',
        updatedAt: new Date(),
      })
      .where(eq(PaymentTable.id, params.paymentId));
  } else if (params.paymentType === 'INSTALLMENTS') {
    // Update installment record
    await tx
      .update(InstallmentPaymentTable)
      .set({
        isPaid: true,
        paymentMode: 'PAYMENT_LINK',
        paymentDate: currentDate,
        updatedAt: new Date(),
      })
      .where(eq(InstallmentPaymentTable.id, params.referenceId));

    // Fetch all installments to calculate payment status
    const allInstallments = await tx.query.InstallmentPaymentTable.findMany({
      where: eq(InstallmentPaymentTable.paymentId, params.paymentId),
    });

    const paidCount = allInstallments.filter((inst) => inst.isPaid === true).length;
    const paymentStatus =
      paidCount === 0 ? 'PENDING' : paidCount === 1 ? 'PARTIALLY_PAID' : 'FULLY_PAID';

    // Update main payment status
    await tx
      .update(PaymentTable)
      .set({
        paymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(PaymentTable.id, params.paymentId));
  }
}

/**
 * Handles a paid Razorpay payment link
 * Updates transaction and payment records in a single transaction
 */
export async function handlePaidRazorpayLink(params: {
  transactionId: string;
  paymentId: string;
  paymentType: 'FULL_PAYMENT' | 'INSTALLMENTS';
  referenceId: string;
  installmentNumber: number | null;
  razorpayLink: PaymentLinks.RazorpayPaymentLink;
}) {
  await db.transaction(async (tx) => {
    // Extract Razorpay payment ID from the link
    // Razorpay returns payments as an array or object depending on the response
    const payments = Array.isArray(params.razorpayLink.payments)
      ? params.razorpayLink.payments
      : params.razorpayLink.payments
        ? [params.razorpayLink.payments]
        : [];
    const razorpayPaymentId = payments[0]?.id;
    const txnDate = payments[0]?.created_at ? new Date(payments[0].created_at * 1000) : null;

    // Update transaction record
    await tx
      .update(TransactionTable)
      .set({
        transactionStatus: 'SUCCESS',
        paymentLinkStatus: params.razorpayLink.status,
        razorpayPaymentId: razorpayPaymentId,
        txnId: razorpayPaymentId,
        txnDate: txnDate,
        updatedAt: new Date(),
      })
      .where(eq(TransactionTable.id, params.transactionId));

    // Update payment tables
    await markPaymentAsPaidInTransaction(tx, {
      paymentId: params.paymentId,
      paymentType: params.paymentType,
      referenceId: params.referenceId,
      installmentNumber: params.installmentNumber,
    });
  });

  // Trigger payment notification workflow (fire-and-forget)
  await triggerPaymentNotification({
    transactionId: params.transactionId,
  });
}

/**
 * Cancels an expired or invalid Razorpay payment link
 */
export async function cancelRazorpayLink(
  instance: Razorpay,
  transactionId: string,
  paymentLinkId: string
) {
  try {
    // Try to cancel on Razorpay
    await instance.paymentLink.cancel(paymentLinkId);
    console.log(`Cancelled old payment link: ${paymentLinkId}`);
  } catch (error) {
    console.warn(`Could not cancel old payment link: ${paymentLinkId}`, error);
  }

  // Mark as cancelled in DB
  await db
    .update(TransactionTable)
    .set({
      transactionStatus: 'CANCELLED',
      paymentLinkStatus: 'CANCELLED',
      updatedAt: new Date(),
    })
    .where(eq(TransactionTable.id, transactionId));
}

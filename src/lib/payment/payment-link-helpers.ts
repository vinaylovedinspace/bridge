import { db } from '@/db';
import { FullPaymentTable, InstallmentPaymentTable, TransactionTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

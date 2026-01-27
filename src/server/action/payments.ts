'use server';

import type { z } from 'zod';

import { IMMEDIATE_PAYMENT_MODES } from '@/lib/constants/payment';
import { formatDateToYYYYMMDD } from '@/lib/date-time-utils';
import { createManualTransactionRecord } from '@/lib/payment/payment-link-helpers';
import { getBranchConfig } from '@/server/action/branch';
import { upsertPaymentInDB } from '@/server/db/payments';
import { paymentSchema } from '@/types/zod/payment';

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
      branchId: data.branchId ?? branchId,
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

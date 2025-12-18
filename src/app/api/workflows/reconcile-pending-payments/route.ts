import { serve } from '@upstash/workflow/nextjs';
import { db } from '@/db';
import { TransactionTable } from '@/db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { qstashClient } from '@/lib/upstash/workflow';
import { checkPhonePePaymentStatusAction } from '@/server/action/payments';
import { markPaymentAsPaid } from '@/lib/payment/payment-link-helpers';
import {
  getPaymentType,
  getGatewayReferenceId,
  getGatewayLinkId,
  setGatewayResponse,
} from '@/lib/payment/transaction-metadata';

type ReconciliationPayload = {
  trigger?: string;
};

export const { POST } = serve<ReconciliationPayload>(
  async (context) => {
    console.log('Starting payment reconciliation...');

    // Find transactions PENDING for >15 minutes
    const stuckTransactions = await context.run('find-stuck-transactions', async () => {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      return await db.query.TransactionTable.findMany({
        where: and(
          eq(TransactionTable.transactionStatus, 'PENDING'),
          lt(TransactionTable.createdAt, fifteenMinutesAgo)
        ),
        limit: 50, // Process max 50 at a time
      });
    });

    console.log(`Found ${stuckTransactions.length} stuck PENDING transactions`);

    if (stuckTransactions.length === 0) {
      return { success: true, message: 'No stuck transactions found' };
    }

    let successCount = 0;
    let expiredCount = 0;
    let errorCount = 0;

    // Check each stuck transaction
    for (const transaction of stuckTransactions) {
      await context.run(`check-status-${transaction.id}`, async () => {
        try {
          const linkId = getGatewayLinkId(transaction.metadata);
          if (!linkId) {
            console.warn(`Transaction ${transaction.id} has no gateway linkId in metadata`);
            return;
          }

          // Check PhonePe status
          const result = await checkPhonePePaymentStatusAction(linkId);

          if (result.success && result.data?.state === 'COMPLETED') {
            // Payment succeeded but webhook missed! Update now
            console.log(`Webhook missed for transaction ${transaction.id}, updating now...`);

            const firstPayment = result.data.paymentDetails?.[0];
            // Type cast for UPI rail to access utr
            const utr =
              firstPayment?.rail && 'utr' in firstPayment.rail ? firstPayment.rail.utr : undefined;

            const updatedMetadata = setGatewayResponse(transaction.metadata, {
              txnId: firstPayment?.transactionId,
              bankTxnId: utr,
              responseCode: result.data.errorCode,
            });

            await db
              .update(TransactionTable)
              .set({
                transactionStatus: 'SUCCESS',
                metadata: updatedMetadata,
                updatedAt: new Date(),
              })
              .where(eq(TransactionTable.id, transaction.id));

            // Get payment type and reference ID from metadata
            const paymentType = getPaymentType(transaction.metadata) || 'FULL_PAYMENT';
            const referenceId = getGatewayReferenceId(transaction.metadata);

            if (referenceId) {
              await markPaymentAsPaid({
                paymentId: transaction.paymentId,
                paymentType,
                referenceId,
                installmentNumber: transaction.installmentNumber,
              });
            }

            successCount++;
            console.log(`Transaction ${transaction.id} reconciled successfully`);
          } else if (result.success && result.data?.state === 'FAILED') {
            // Payment failed
            const updatedMetadata = setGatewayResponse(transaction.metadata, {
              responseCode: result.data.errorCode,
            });

            await db
              .update(TransactionTable)
              .set({
                transactionStatus: 'FAILED',
                metadata: updatedMetadata,
                updatedAt: new Date(),
              })
              .where(eq(TransactionTable.id, transaction.id));

            expiredCount++;
            console.log(`Transaction ${transaction.id} marked as failed`);
          }
        } catch (error) {
          console.error(`Error reconciling transaction ${transaction.id}:`, error);
          errorCount++;
        }
      });
    }

    console.log('Reconciliation complete:', {
      total: stuckTransactions.length,
      success: successCount,
      expired: expiredCount,
      errors: errorCount,
    });

    return {
      success: true,
      total: stuckTransactions.length,
      reconciled: successCount,
      expired: expiredCount,
      errors: errorCount,
    };
  },
  {
    qstashClient,
    verbose: true,
  }
);

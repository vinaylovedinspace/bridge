import { serve } from '@upstash/workflow/nextjs';
import { db } from '@/db';
import { TransactionTable } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { qstashClient, workflowClient } from '@/lib/upstash/workflow';
import { env } from '@/env';
import type { PhonePeWebhookData } from '@/types/phonepe';
import { mapPhonePeStatusToDbStatus } from '@/lib/payment/status-helpers';
import { markPaymentAsPaid } from '@/lib/payment/payment-link-helpers';
import {
  getPaymentType,
  getGatewayReferenceId,
  setGatewayResponse,
} from '@/lib/payment/transaction-metadata';

export const { POST } = serve<PhonePeWebhookData>(
  async (context) => {
    const payload = context.requestPayload;

    // Step 1: Find transaction by orderId in metadata
    const transaction = await context.run('find-transaction', async () => {
      return await db.query.TransactionTable.findFirst({
        where: sql`${TransactionTable.metadata}->>'gateway'->>'linkId' = ${payload.orderId}`,
      });
    });

    if (!transaction) {
      console.error('Transaction not found for orderId:', payload.orderId);
      return { success: false, error: 'Transaction not found' };
    }

    // Step 2: Check idempotency (avoid duplicate processing)
    if (transaction.transactionStatus === 'SUCCESS') {
      console.log('Transaction already processed:', transaction.id);
      return { success: true, message: 'Already processed' };
    }

    // Step 3: Update transaction status and store response in metadata
    await context.run('update-transaction-status', async () => {
      const newStatus = mapPhonePeStatusToDbStatus(payload.state);
      const firstPayment = payload.paymentDetails?.[0];

      const updatedMetadata = setGatewayResponse(transaction.metadata, {
        txnId: firstPayment?.transactionId,
        bankTxnId: firstPayment?.rail?.utr,
        responseCode: payload.errorCode,
      });

      await db
        .update(TransactionTable)
        .set({
          transactionStatus: newStatus,
          txnDate: new Date(),
          metadata: updatedMetadata,
          updatedAt: new Date(),
        })
        .where(eq(TransactionTable.id, transaction.id));

      console.log('Transaction status updated:', {
        transactionId: transaction.id,
        oldStatus: transaction.transactionStatus,
        newStatus,
        phonePeTransactionId: firstPayment?.transactionId,
      });
    });

    // Step 4: If SUCCESS, update payment records
    if (payload.state === 'COMPLETED') {
      await context.run('mark-payment-paid', async () => {
        // Get payment type and reference ID from metadata
        const paymentType = getPaymentType(transaction.metadata) || 'FULL_PAYMENT';
        const referenceId = getGatewayReferenceId(transaction.metadata);

        if (!referenceId) {
          console.error('No reference ID found in transaction metadata:', transaction.id);
          return;
        }

        await markPaymentAsPaid({
          paymentId: transaction.paymentId,
          paymentType,
          referenceId,
          installmentNumber: transaction.installmentNumber,
        });

        console.log('Payment marked as paid:', {
          paymentId: transaction.paymentId,
          paymentType,
          referenceId,
        });
      });

      // Step 5: Trigger notification workflow
      await context.run('trigger-notification', async () => {
        await workflowClient.trigger({
          url: `${env.NEXT_PUBLIC_APP_URL}/api/workflows/payment-notification`,
          body: JSON.stringify({
            transactionId: transaction.id,
          }),
          retries: 3,
        });

        console.log('Notification workflow triggered for transaction:', transaction.id);
      });
    }

    // Step 6: If FAILED, log reason
    if (payload.state === 'FAILED') {
      await context.run('log-failure', async () => {
        const firstPayment = payload.paymentDetails?.[0];
        console.error('Payment failed:', {
          transactionId: transaction.id,
          paymentId: transaction.paymentId,
          errorCode: payload.errorCode,
          phonePeTransactionId: firstPayment?.transactionId,
        });
      });
    }

    return { success: true, transactionId: transaction.id, state: payload.state };
  },
  {
    qstashClient,
    verbose: true,
  }
);

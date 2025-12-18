import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { TransactionTable } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { mapPhonePeStatusToDbStatus } from '@/lib/payment/status-helpers';
import { markPaymentAsPaid } from '@/lib/payment/payment-link-helpers';
import { env } from '@/env';
import { StandardCheckoutClient, Env } from 'pg-sdk-node';
import type { PhonePeWebhookData } from '@/types/phonepe';
import { workflowClient } from '@/lib/upstash/workflow';
import {
  getPaymentType,
  getGatewayReferenceId,
  setGatewayResponse,
} from '@/lib/payment/transaction-metadata';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // PhonePe sends S2S callback with Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Missing Authorization header' },
        { status: 400 }
      );
    }

    // Initialize PhonePe client for validation
    const phonepeEnv = env.PHONEPE_ENV === 'PRODUCTION' ? Env.PRODUCTION : Env.SANDBOX;
    const client = StandardCheckoutClient.getInstance(
      env.PHONEPE_CLIENT_ID,
      env.PHONEPE_CLIENT_SECRET,
      env.PHONEPE_CLIENT_VERSION,
      phonepeEnv
    );

    // Validate callback using SDK
    const bodyString = JSON.stringify(body);
    let webhookData: PhonePeWebhookData;

    try {
      const callbackResponse = client.validateCallback(
        env.PHONEPE_CLIENT_ID,
        env.PHONEPE_CLIENT_SECRET,
        authHeader,
        bodyString
      );

      webhookData = {
        orderId: callbackResponse.payload.orderId,
        state: callbackResponse.payload.state,
        amount: callbackResponse.payload.amount,
        errorCode: callbackResponse.payload.errorCode,
        paymentDetails: callbackResponse.payload.paymentDetails,
      };
    } catch (validationError) {
      console.error('Invalid PhonePe webhook signature:', validationError);
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    // Find transaction by orderId (merchantOrderId) in metadata.gateway.linkId
    const transaction = await db.query.TransactionTable.findFirst({
      where: sql`${TransactionTable.metadata}->>'gateway'->>'linkId' = ${webhookData.orderId}`,
    });

    if (!transaction) {
      console.error('Transaction not found for orderId:', webhookData.orderId);
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    // Check idempotency (avoid duplicate processing)
    if (transaction.transactionStatus === 'SUCCESS') {
      console.log('Transaction already processed:', transaction.id);
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // Update transaction status and store gateway response in metadata
    const newStatus = mapPhonePeStatusToDbStatus(webhookData.state);
    const firstPayment = webhookData.paymentDetails?.[0];

    const updatedMetadata = setGatewayResponse(transaction.metadata, {
      txnId: firstPayment?.transactionId,
      bankTxnId: firstPayment?.rail?.utr,
      responseCode: webhookData.errorCode,
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

    // If SUCCESS, update payment records
    if (webhookData.state === 'COMPLETED') {
      // Get payment type from transaction metadata
      const paymentType = getPaymentType(transaction.metadata) || 'FULL_PAYMENT';
      const referenceId = getGatewayReferenceId(transaction.metadata);

      if (!referenceId) {
        console.error('No reference ID found in transaction metadata:', transaction.id);
        return NextResponse.json(
          { success: false, error: 'Invalid transaction metadata' },
          { status: 400 }
        );
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

      // Trigger notification workflow
      await workflowClient.trigger({
        url: `${env.NEXT_PUBLIC_APP_URL}/api/workflows/payment-notification`,
        body: JSON.stringify({
          transactionId: transaction.id,
        }),
        retries: 3,
      });

      console.log('Notification workflow triggered for transaction:', transaction.id);
    }

    // If FAILED, log reason
    if (webhookData.state === 'FAILED') {
      console.error('Payment failed:', {
        transactionId: transaction.id,
        paymentId: transaction.paymentId,
        errorCode: webhookData.errorCode,
        phonePeTransactionId: firstPayment?.transactionId,
      });
    }

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      state: webhookData.state,
    });
  } catch (error) {
    console.error('Error processing PhonePe webhook:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { env } from '@/env';
import crypto from 'crypto';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { TransactionTable } from '@/db/schema/transactions/columns';
import { FullPaymentTable, PaymentTable, InstallmentPaymentTable } from '@/db/schema';
import { CreatePaymentLinkParams } from '@/lib/cashfree/client';
import { formatDateToYYYYMMDD } from '@/lib/date-time-utils';

// Cashfree webhook event types
type CashfreeWebhookEvent = {
  type: 'PAYMENT_LINK_EVENT';
  version: string;
  event_time: string;
  data: {
    cf_link_id: number;
    link_id: string;
    link_status: 'ACTIVE' | 'INACTIVE' | 'PAID' | 'EXPIRED' | 'PARTIALLY_PAID' | 'CANCELLED';
    link_currency: string;
    link_amount: string;
    link_amount_paid: string;
    link_partial_payments: boolean;
    link_minimum_partial_amount?: string;
    link_purpose: string;
    link_created_at: string;
    customer_details: {
      customer_name: string;
      customer_email: string;
      customer_phone: string;
    };
    link_meta?: {
      notify_url?: string;
      return_url?: string;
    };
    link_url: string;
    link_expiry_time?: string;
    link_notes?: CreatePaymentLinkParams['link_notes'];
    link_auto_reminders: boolean;
    link_notify: {
      send_sms: boolean;
      send_email: boolean;
    };
    order?: {
      order_amount: string;
      order_id: string;
      order_expiry_time: string;
      order_hash: string;
      transaction_id: number;
      transaction_status: 'SUCCESS' | 'FAILED' | 'PENDING';
    };
  };
};

// Verify Cashfree webhook signature using timestamp + payload method
function verifyCashfreeWebhookSignature(
  timestamp: string,
  payload: string,
  signature: string
): boolean {
  try {
    // Cashfree signature format: timestamp + payload
    const signedPayload = timestamp + payload;

    const expectedSignature = crypto
      .createHmac('sha256', env.CASHFREE_CLIENT_SECRET)
      .update(signedPayload)
      .digest('base64');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (error) {
    console.error('Error verifying Cashfree webhook signature:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the raw payload text (required for signature verification)
    const payload = await request.text();

    // Get headers
    const headersList = await headers();
    const signature = headersList.get('x-webhook-signature');
    const timestamp = headersList.get('x-webhook-timestamp');

    // Log all headers for debugging (remove in production)
    console.log('Webhook headers:', Object.fromEntries(headersList.entries()));

    if (!signature) {
      console.error('Missing webhook signature in headers');
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 });
    }

    if (!timestamp) {
      console.error('Missing webhook timestamp in headers');
      return NextResponse.json({ error: 'Missing webhook timestamp' }, { status: 401 });
    }

    const isValid = verifyCashfreeWebhookSignature(timestamp, payload, signature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.log('Webhook signature verified successfully');

    // Parse the webhook event
    const webhookEvent = JSON.parse(payload);

    console.log('Received Cashfree webhook payload:', webhookEvent);

    // Validate the webhook structure
    if (!webhookEvent.data) {
      console.error('Invalid webhook: missing data field');
      return NextResponse.json({ error: 'Invalid webhook format' }, { status: 400 });
    }

    console.log('Webhook summary:', {
      type: webhookEvent.type,
      hasOrder: !!webhookEvent.data.order,
      hasCustomer: !!webhookEvent.data.customer_details,
    });

    // Handle payment link events
    if (webhookEvent.type === 'PAYMENT_LINK_EVENT') {
      await handlePaymentLinkEvent(webhookEvent);
    } else {
      console.log('Unknown webhook event type:', webhookEvent.type);
    }

    // Return success response
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handlePaymentLinkEvent(event: CashfreeWebhookEvent) {
  console.log('Processing payment link event');

  try {
    const { data } = event;
    const paymentId = data.link_notes?.paymentId;
    const type = data.link_notes?.type as 'enrollment' | 'rto-service' | undefined;

    console.log('Payment link event details:', {
      linkId: data.link_id,
      linkStatus: data.link_status,
      transactionStatus: data.order?.transaction_status,
      orderId: data.order?.order_id,
      transactionId: data.order?.transaction_id,
      linkAmount: data.link_amount,
      amountPaid: data.link_amount_paid,
      customerPhone: data.customer_details.customer_phone,
      customerName: data.customer_details.customer_name,
      paymentId,
      type,
    });

    // Handle based on transaction status (if order exists)
    if (!data.order) {
      console.log('No order data in webhook, link status:', data.link_status);
      return;
    }

    switch (data.order.transaction_status) {
      case 'SUCCESS':
        await handleSuccessfulPayment(data, paymentId, type);
        break;
      case 'FAILED':
        await handleFailedPayment(data, paymentId, type);
        break;
      case 'PENDING':
        console.log('Payment is pending, no action needed');
        break;
      default:
        console.log('Unknown transaction status:', data.order.transaction_status);
    }
  } catch (error) {
    console.error('Error handling payment link event:', error);
  }
}

async function handleSuccessfulPayment(
  data: CashfreeWebhookEvent['data'],
  paymentId?: string,
  type?: 'enrollment' | 'rto-service'
) {
  console.log('Processing successful payment');

  if (!paymentId || !data.order) {
    console.error('Missing required data:', { paymentId, hasOrder: !!data.order });
    return;
  }

  const transactionId = data.order.transaction_id.toString();
  const orderId = data.order.order_id;
  const amountPaidInPaise = Math.round(parseFloat(data.link_amount_paid) * 100);

  console.log('Payment success details:', {
    amountPaid: data.link_amount_paid,
    totalAmount: data.link_amount,
    paymentId,
    transactionId,
    type,
  });

  try {
    // Check for duplicate transaction (idempotency)
    const existingTransaction = await db.query.TransactionTable.findFirst({
      where: eq(TransactionTable.txnId, transactionId),
    });

    if (existingTransaction) {
      console.log('Transaction already processed:', transactionId);
      return;
    }

    const payment = await db.query.PaymentTable.findFirst({
      where: eq(PaymentTable.id, paymentId),
    });

    if (!payment) {
      console.error('Payment not found:', paymentId);
      return;
    }

    const paymentDate = formatDateToYYYYMMDD(new Date());

    // Handle based on payment type
    if (payment.paymentType === 'FULL_PAYMENT') {
      await db.transaction(async (tx) => {
        // Create transaction record
        await tx.insert(TransactionTable).values({
          paymentId,
          amount: amountPaidInPaise,
          paymentMode: 'PAYMENT_LINK',
          transactionStatus: 'SUCCESS',
          transactionReference: orderId,
          txnId: transactionId,
          notes: `Cashfree payment link - Full payment (${type || 'unknown'})`,
          gatewayName: 'Cashfree',
        });

        // Update payment status
        await tx
          .update(PaymentTable)
          .set({ paymentStatus: 'FULLY_PAID' })
          .where(eq(PaymentTable.id, paymentId));

        // Create full payment record
        await tx.insert(FullPaymentTable).values({
          paymentId,
          isPaid: true,
          paymentDate,
          paymentMode: 'PAYMENT_LINK',
        });
      });

      console.log('Full payment completed for payment id:', paymentId);
    } else if (payment.paymentType === 'INSTALLMENTS') {
      await handleInstallmentPayment(
        paymentId,
        amountPaidInPaise,
        paymentDate,
        orderId,
        transactionId,
        type
      );
    } else {
      console.error('Unsupported payment type:', payment.paymentType);
    }

    console.log('Payment processing completed for payment id:', paymentId, 'type:', type);
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
}

async function handleInstallmentPayment(
  paymentId: string,
  amountPaidInPaise: number,
  paymentDate: string,
  orderId: string,
  transactionId: string,
  type?: 'enrollment' | 'rto-service'
) {
  const existingInstallments = await db.query.InstallmentPaymentTable.findMany({
    where: eq(InstallmentPaymentTable.paymentId, paymentId),
  });

  const firstInstallment = existingInstallments.find((inst) => inst.installmentNumber === 1);
  const secondInstallment = existingInstallments.find((inst) => inst.installmentNumber === 2);

  // Determine which installment to process
  const installmentNumber = !firstInstallment?.isPaid ? 1 : 2;
  const isLastInstallment = installmentNumber === 2;
  const existingInstallment = installmentNumber === 1 ? firstInstallment : secondInstallment;

  if (installmentNumber === 2 && !firstInstallment?.isPaid) {
    console.error('Cannot process second installment before first installment is paid');
    return;
  }

  if (existingInstallment?.isPaid) {
    console.log(`Installment ${installmentNumber} already paid, ignoring duplicate`);
    return;
  }

  await db.transaction(async (tx) => {
    // Create transaction record
    await tx.insert(TransactionTable).values({
      paymentId,
      amount: amountPaidInPaise,
      paymentMode: 'PAYMENT_LINK',
      transactionStatus: 'SUCCESS',
      transactionReference: orderId,
      txnId: transactionId,
      notes: `Cashfree payment link - Installment ${installmentNumber} (${type || 'unknown'})`,
      gatewayName: 'Cashfree',
    });

    // Create or update installment
    if (existingInstallment) {
      await tx
        .update(InstallmentPaymentTable)
        .set({
          isPaid: true,
          amount: Math.round(amountPaidInPaise / 100), // Convert paise to rupees
          paymentMode: 'PAYMENT_LINK',
          paymentDate,
        })
        .where(eq(InstallmentPaymentTable.id, existingInstallment.id));
    } else {
      await tx.insert(InstallmentPaymentTable).values({
        paymentId,
        installmentNumber,
        amount: Math.round(amountPaidInPaise / 100), // Convert paise to rupees
        isPaid: true,
        paymentMode: 'PAYMENT_LINK',
        paymentDate,
      });
    }

    // Update payment status
    await tx
      .update(PaymentTable)
      .set({
        paymentStatus: isLastInstallment ? 'FULLY_PAID' : 'PARTIALLY_PAID',
      })
      .where(eq(PaymentTable.id, paymentId));
  });

  console.log(`Installment ${installmentNumber} paid for payment id:`, paymentId);
}

async function handleFailedPayment(
  data: CashfreeWebhookEvent['data'],
  paymentId?: string,
  type?: 'enrollment' | 'rto-service'
) {
  if (!paymentId) {
    console.error('No paymentId found in webhook data');
    return;
  }

  if (!data.order) {
    console.error('No order data for failed payment');
    return;
  }

  try {
    const payment = await db.query.PaymentTable.findFirst({
      where: eq(PaymentTable.id, paymentId),
    });

    if (!payment) {
      console.error('Payment not found:', paymentId);
      return;
    }

    // Create failed transaction record
    await db.insert(TransactionTable).values({
      paymentId,
      amount: Math.round(parseFloat(data.link_amount || '0') * 100), // Convert to paise
      paymentMode: 'PAYMENT_LINK',
      transactionStatus: 'FAILED',
      transactionReference: data.order.order_id,
      txnId: data.order.transaction_id.toString(),
      notes: `Cashfree payment link transaction failed (${type || 'unknown'})`,
      gatewayName: 'Cashfree',
    });

    console.log('Recorded failed payment attempt for payment id:', paymentId, 'type:', type);
    console.log('Payment status remains as:', payment.paymentStatus);
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}

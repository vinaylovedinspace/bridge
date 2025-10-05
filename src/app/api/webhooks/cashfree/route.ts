import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { env } from '@/env';
import crypto from 'crypto';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { TransactionTable } from '@/db/schema/transactions/columns';
import { PaymentTable, PlanTable } from '@/db/schema';

// Cashfree webhook event types
type CashfreeWebhookEvent = {
  type: 'PAYMENT_LINK_EVENT';
  version: string;
  event_time: string;
  data: {
    cf_link_id: number;
    link_id: string;
    link_status: 'ACTIVE' | 'INACTIVE' | 'PAID' | 'EXPIRED' | 'PARTIALLY_PAID';
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
    link_notes?: Record<string, string>;
    link_auto_reminders: boolean;
    link_notify: {
      send_sms: boolean;
      send_email: boolean;
    };
    order: {
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
      hasPayment: !!webhookEvent.data.payment,
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
    const planId = data.link_notes?.planId;

    console.log('Payment link event details:', {
      linkId: data.link_id,
      linkStatus: data.link_status,
      transactionStatus: data.order.transaction_status,
      orderId: data.order.order_id,
      transactionId: data.order.transaction_id,
      linkAmount: data.link_amount,
      amountPaid: data.link_amount_paid,
      customerPhone: data.customer_details.customer_phone,
      customerName: data.customer_details.customer_name,
      planId,
    });

    // Handle based on transaction status
    switch (data.order.transaction_status) {
      case 'SUCCESS':
        await handleSuccessfulPayment(data, planId);
        break;
      case 'FAILED':
        await handleFailedPayment(data, planId);
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

async function handleSuccessfulPayment(data: CashfreeWebhookEvent['data'], planId?: string) {
  console.log('Processing successful payment');

  // Check if payment is complete
  const isFullyPaid = data.link_status === 'PAID';
  const isPartiallyPaid = data.link_status === 'PARTIALLY_PAID';

  console.log('Payment success details:', {
    isFullyPaid,
    isPartiallyPaid,
    amountPaid: data.link_amount_paid,
    totalAmount: data.link_amount,
    planId,
  });

  if (!planId) {
    console.error('No planId found in webhook data');
    return;
  }

  try {
    // Get the payment record associated with this plan

    const plan = await db.query.PlanTable.findFirst({
      where: eq(PlanTable.id, planId),
      with: {
        payment: true,
      },
    });

    if (!plan?.payment?.id) {
      console.error('No payment found for planId:', planId);
      return;
    }

    const paymentId = plan.payment.id;

    // Create transaction record
    await db.insert(TransactionTable).values({
      paymentId,
      amount: Math.round(parseFloat(data.link_amount_paid) * 100), // Convert to paise
      paymentMode: 'PAYMENT_LINK',
      transactionStatus: 'SUCCESS',
      transactionReference: data.order.order_id,
      txnId: data.order.transaction_id.toString(),
      notes: `Cashfree payment link transaction - ${data.link_status}`,
      gatewayName: 'Cashfree',
    });

    // Update payment status based on payment completion
    const newPaymentStatus = isFullyPaid ? 'FULLY_PAID' : 'PARTIALLY_PAID';

    await db
      .update(PaymentTable)
      .set({
        paymentStatus: newPaymentStatus,
        // Update payment flags based on payment type
        ...(plan.payment.paymentType === 'FULL_PAYMENT' && {
          fullPaymentPaid: isFullyPaid,
        }),
        ...(plan.payment.paymentType === 'INSTALLMENTS' && {
          firstInstallmentPaid: true, // Payment link payments count as first installment
        }),
      })
      .where(eq(PaymentTable.id, paymentId));

    // TODO: Send confirmation SMS/email to customer
    console.log('Payment processing completed for planId:', planId);
  } catch (error) {
    console.error('Error updating payment status:', error);
  }
}

async function handleFailedPayment(data: CashfreeWebhookEvent['data'], planId?: string) {
  if (!planId) {
    console.error('No planId found in webhook data');
    return;
  }

  try {
    // Get the payment record associated with this plan
    const payment = await db.query.PaymentTable.findFirst({
      where: eq(PaymentTable.id, planId),
    });

    if (!payment) {
      console.error('No payment found for planId:', planId);
      return;
    }

    // Create failed transaction record
    await db.insert(TransactionTable).values({
      paymentId: payment.id,
      amount: Math.round(parseFloat(data.link_amount || '0') * 100), // Convert to paise
      paymentMode: 'PAYMENT_LINK',
      transactionStatus: 'FAILED',
      transactionReference: data.order.order_id,
      txnId: data.order.transaction_id.toString(),
      notes: `Cashfree payment link transaction failed`,
      gatewayName: 'Cashfree',
    });

    console.log('Recorded failed payment attempt for planId:', planId);
    console.log('Payment status remains as:', payment.paymentStatus);
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}

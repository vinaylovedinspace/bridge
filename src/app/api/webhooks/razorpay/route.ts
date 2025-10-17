import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';
import crypto from 'crypto';
import { db } from '@/db';
import {
  PaymentTable,
  FullPaymentTable,
  InstallmentPaymentTable,
  TransactionTable,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Razorpay Webhook Handler
 * Handles payment link webhook events and updates payment status
 * based on reference_id (which maps to payment.id)
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(body, signature, env.RAZORPAY_WEBHOOK_SECRET);

    if (!isValid) {
      console.error('Invalid Razorpay webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse the verified payload
    const payload = JSON.parse(body);
    const event = payload.event;

    console.log('Razorpay webhook event:', event);

    // Handle payment link events
    if (event === 'payment_link.paid') {
      await handlePaymentLinkPaid(payload);
    } else if (event === 'payment_link.partially_paid') {
      await handlePaymentLinkPartiallyPaid(payload);
    } else if (event === 'payment_link.expired') {
      await handlePaymentLinkExpired(payload);
    } else if (event === 'payment_link.cancelled') {
      await handlePaymentLinkCancelled(payload);
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Error processing Razorpay webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * Verifies the webhook signature using HMAC SHA256
 */
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

  return expectedSignature === signature;
}

/**
 * Handles payment_link.paid event
 * Updates payment status to FULLY_PAID
 */
async function handlePaymentLinkPaid(payload: RazorpayWebhookPayload) {
  const paymentLinkData = payload.payload.payment_link.entity;
  const paymentData = payload.payload.payment?.entity;
  const referenceId = paymentLinkData.reference_id;
  const notes = paymentLinkData.notes;
  const amountPaid = paymentLinkData.amount_paid / 100; // Convert paise to rupees

  console.log(`Payment link paid for reference ID: ${referenceId}, amount: ${amountPaid}`);

  // Extract metadata from notes
  const paymentId = notes?.payment_id;
  const paymentType = notes?.payment_type as 'FULL_PAYMENT' | 'INSTALLMENTS';

  if (!paymentId || !paymentType) {
    console.error('Missing payment metadata in notes:', notes);
    return;
  }

  const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '');

  // Update transaction record
  await db
    .update(TransactionTable)
    .set({
      transactionStatus: 'SUCCESS',
      paymentLinkStatus: paymentLinkData.status,
      razorpayPaymentId: paymentData?.id,
      txnId: paymentData?.id,
      txnDate: paymentData?.created_at ? new Date(paymentData.created_at * 1000) : null,
      updatedAt: new Date(),
    })
    .where(eq(TransactionTable.paymentLinkId, paymentLinkData.id));

  // Update payment status based on payment type
  if (paymentType === 'FULL_PAYMENT') {
    // For full payment, reference_id is the full_payment.id
    // Update the full payment record using the reference_id
    await db
      .update(FullPaymentTable)
      .set({
        isPaid: true,
        paymentMode: 'PAYMENT_LINK',
        paymentDate: currentDate,
        updatedAt: new Date(),
      })
      .where(eq(FullPaymentTable.id, referenceId));

    // Update payment status using payment_id from notes
    await db
      .update(PaymentTable)
      .set({
        paymentStatus: 'FULLY_PAID',
        updatedAt: new Date(),
      })
      .where(eq(PaymentTable.id, paymentId));

    console.log(`Full payment marked as paid for payment ID: ${paymentId}`);
  } else if (paymentType === 'INSTALLMENTS') {
    // For installments, reference_id is the installment.id
    // Update the installment record using the reference_id
    await db
      .update(InstallmentPaymentTable)
      .set({
        isPaid: true,
        paymentMode: 'PAYMENT_LINK',
        paymentDate: currentDate,
        updatedAt: new Date(),
      })
      .where(eq(InstallmentPaymentTable.id, referenceId));

    // Check if all installments are now paid
    const installments = await db.query.InstallmentPaymentTable.findMany({
      where: eq(InstallmentPaymentTable.paymentId, paymentId),
    });

    const allPaid = installments.every((inst) => (inst.id === referenceId ? true : inst.isPaid));

    const newStatus = allPaid ? 'FULLY_PAID' : 'PARTIALLY_PAID';

    // Update payment status using payment_id from notes
    await db
      .update(PaymentTable)
      .set({
        paymentStatus: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(PaymentTable.id, paymentId));

    console.log(`Installment payment marked as paid for payment ID: ${paymentId}`);
  }
}

/**
 * Handles payment_link.partially_paid event
 * Updates payment status to PARTIALLY_PAID
 */
async function handlePaymentLinkPartiallyPaid(payload: RazorpayWebhookPayload) {
  const paymentLinkData = payload.payload.payment_link.entity;
  const notes = paymentLinkData.notes;
  const amountPaid = paymentLinkData.amount_paid / 100;

  console.log(`Payment link partially paid, amount: ${amountPaid}`);

  const paymentId = notes?.payment_id;
  if (!paymentId) {
    console.error('Missing payment_id in notes');
    return;
  }

  // Update transaction record
  await db
    .update(TransactionTable)
    .set({
      paymentLinkStatus: paymentLinkData.status,
      updatedAt: new Date(),
    })
    .where(eq(TransactionTable.paymentLinkId, paymentLinkData.id));

  // Update payment status to partially paid
  await db
    .update(PaymentTable)
    .set({
      paymentStatus: 'PARTIALLY_PAID',
      updatedAt: new Date(),
    })
    .where(eq(PaymentTable.id, paymentId));

  console.log(`Payment status updated to PARTIALLY_PAID for payment ID: ${paymentId}`);
}

/**
 * Handles payment_link.expired event
 */
async function handlePaymentLinkExpired(payload: RazorpayWebhookPayload) {
  const paymentLinkData = payload.payload.payment_link.entity;

  console.log(`Payment link expired: ${paymentLinkData.id}`);

  // Update transaction record to mark as expired
  await db
    .update(TransactionTable)
    .set({
      transactionStatus: 'CANCELLED',
      paymentLinkStatus: paymentLinkData.status,
      updatedAt: new Date(),
    })
    .where(eq(TransactionTable.paymentLinkId, paymentLinkData.id));
}

/**
 * Handles payment_link.cancelled event
 */
async function handlePaymentLinkCancelled(payload: RazorpayWebhookPayload) {
  const paymentLinkData = payload.payload.payment_link.entity;

  console.log(`Payment link cancelled: ${paymentLinkData.id}`);

  // Update transaction record to mark as cancelled
  await db
    .update(TransactionTable)
    .set({
      transactionStatus: 'CANCELLED',
      paymentLinkStatus: paymentLinkData.status,
      updatedAt: new Date(),
    })
    .where(eq(TransactionTable.paymentLinkId, paymentLinkData.id));
}

// Type definitions for Razorpay webhook payload
type RazorpayWebhookPayload = {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment_link: {
      entity: {
        id: string;
        reference_id: string;
        amount: number;
        amount_paid: number;
        status: string;
        notes?: {
          payment_id?: string;
          payment_type?: string;
          type?: string;
          installment_id?: string;
        };
        customer: {
          name: string;
          email: string;
          contact: string;
        };
        created_at: number;
        updated_at: number;
        expired_at?: number;
      };
    };
    payment?: {
      entity: {
        id: string;
        amount: number;
        status: string;
        method: string;
        captured: boolean;
        created_at: number;
      };
    };
  };
  created_at: number;
};

import { serve } from '@upstash/workflow/nextjs';
import { Client } from '@upstash/qstash';
import { db } from '@/db';
import { TransactionTable } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { env } from '@/env';
import Razorpay from 'razorpay';
import { handlePaidRazorpayLink } from '@/lib/payment/payment-link-helpers';

type PaymentLinkLifecyclePayload = {
  paymentLinkId: string;
  referenceId: string;
  paymentId: string;
  paymentType: 'FULL_PAYMENT' | 'INSTALLMENTS';
  installmentNumber: number | null;
  expiryTime: number; // Unix timestamp in milliseconds
};

export const { POST } = serve<PaymentLinkLifecyclePayload>(
  async (context) => {
    const { paymentLinkId, referenceId, paymentId, paymentType, installmentNumber, expiryTime } =
      context.requestPayload;

    // Sleep until payment link expiry time
    await context.sleepUntil('wait-for-expiry', expiryTime);

    // Check transaction status and handle accordingly
    await context.run('check-payment-status', async () => {
      // Get transaction from database
      const transaction = await db.query.TransactionTable.findFirst({
        where: and(
          eq(TransactionTable.paymentLinkId, paymentLinkId),
          isNull(TransactionTable.deletedAt)
        ),
      });

      if (!transaction) {
        console.warn(
          `[Payment Link Workflow] Transaction not found for payment link: ${paymentLinkId}`
        );
        return;
      }

      // If transaction is already SUCCESS, webhook worked - nothing to do
      if (transaction.transactionStatus === 'SUCCESS') {
        console.log(
          `[Payment Link Workflow] Payment link ${paymentLinkId} already processed (SUCCESS)`
        );
        return;
      }

      // If transaction is CANCELLED or FAILED, skip
      if (['CANCELLED', 'FAILED'].includes(transaction.transactionStatus)) {
        console.log(
          `[Payment Link Workflow] Payment link ${paymentLinkId} is ${transaction.transactionStatus}, skipping`
        );
        return;
      }

      // Transaction is still PENDING - verify with Razorpay
      console.log(
        `[Payment Link Workflow] Transaction ${transaction.id} is PENDING, verifying with Razorpay`
      );

      try {
        const razorpay = new Razorpay({
          key_id: env.RAZORPAY_API_KEY,
          key_secret: env.RAZORPAY_API_SECRET,
        });

        // Fetch payment link status from Razorpay
        const razorpayLink = await razorpay.paymentLink.fetch(paymentLinkId);

        if (razorpayLink.status === 'paid') {
          // Payment was made but webhook missed - update database
          console.log(
            `[Payment Link Workflow] Payment link ${paymentLinkId} was PAID but webhook missed! Updating DB...`
          );

          await handlePaidRazorpayLink({
            transactionId: transaction.id,
            paymentId,
            paymentType,
            referenceId,
            installmentNumber,
            razorpayLink,
          });

          console.log(
            `[Payment Link Workflow] Successfully updated DB for missed webhook: ${paymentLinkId}`
          );
        } else if (['expired', 'cancelled'].includes(razorpayLink.status)) {
          // Payment link expired or cancelled
          console.log(
            `[Payment Link Workflow] Payment link ${paymentLinkId} status is ${razorpayLink.status}, marking as CANCELLED`
          );

          await db
            .update(TransactionTable)
            .set({
              transactionStatus: 'CANCELLED',
              paymentLinkStatus: razorpayLink.status,
              updatedAt: new Date(),
            })
            .where(eq(TransactionTable.id, transaction.id));

          console.log(`[Payment Link Workflow] Marked transaction ${transaction.id} as CANCELLED`);
        } else {
          // Payment link still active/created but not paid
          console.log(
            `[Payment Link Workflow] Payment link ${paymentLinkId} status is ${razorpayLink.status}, no action needed`
          );
        }
      } catch (error) {
        console.error(
          `[Payment Link Workflow] Error verifying payment link ${paymentLinkId} with Razorpay:`,
          error
        );

        // If we can't reach Razorpay, mark as CANCELLED to be safe
        await db
          .update(TransactionTable)
          .set({
            transactionStatus: 'CANCELLED',
            updatedAt: new Date(),
          })
          .where(eq(TransactionTable.id, transaction.id));

        console.log(
          `[Payment Link Workflow] Marked transaction ${transaction.id} as CANCELLED due to verification error`
        );
      }
    });
  },
  {
    qstashClient: new Client({ token: env.QSTASH_TOKEN }),
    verbose: true,
  }
);

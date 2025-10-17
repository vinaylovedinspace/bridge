import { Client } from '@upstash/workflow';
import { env } from '@/env';

type PaymentNotificationData = {
  transactionId: string;
};

/**
 * Triggers an Upstash Workflow to send payment notification.
 * The workflow will send an in-app notification when a payment is received.
 *
 * This function is fire-and-forget - it doesn't wait for the workflow to complete.
 *
 * Local Development:
 * - Requires running: npx @upstash/qstash-cli dev
 * - Set QSTASH_URL=http://127.0.0.1:8080 in .env.local
 */
export async function triggerPaymentNotification(data: PaymentNotificationData): Promise<void> {
  try {
    const client = new Client({ token: env.QSTASH_TOKEN, baseUrl: env.QSTASH_URL });

    const { workflowRunId } = await client.trigger({
      url: `${env.NEXT_PUBLIC_APP_URL}/api/workflows/payment-notification`,
      body: JSON.stringify(data),
      retries: 3,
    });

    console.log(
      `Payment notification workflow triggered for transaction ${data.transactionId} (runId: ${workflowRunId})`
    );
  } catch (error) {
    console.error(
      `Error triggering payment notification for transaction ${data.transactionId}:`,
      error
    );
  }
}

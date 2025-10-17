import { Client } from '@upstash/workflow';
import { env } from '@/env';
import { getWorkflowBaseUrl, shouldEnableWorkflows } from './workflow-utils';

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
  if (!shouldEnableWorkflows()) {
    console.log(
      `[DEV] Workflows disabled for transaction ${data.transactionId}. Run 'npx @upstash/qstash-cli dev' to enable.`
    );
    return;
  }

  try {
    const client = new Client({ token: env.QSTASH_TOKEN });
    const baseUrl = getWorkflowBaseUrl();

    const { workflowRunId } = await client.trigger({
      url: `${baseUrl}/api/workflows/payment-notification`,
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

import { Client } from '@upstash/workflow';
import { env } from '@/env';
import { getWorkflowBaseUrl, shouldEnableWorkflows } from './workflow-utils';

type PaymentLinkWorkflowData = {
  paymentLinkId: string;
  referenceId: string;
  paymentId: string;
  paymentType: 'FULL_PAYMENT' | 'INSTALLMENTS';
  installmentNumber: number | null;
  expiryTime: number; // Unix timestamp in milliseconds
};

/**
 * Triggers an Upstash Workflow to manage payment link lifecycle.
 * The workflow will:
 * 1. Sleep until payment link expiry time
 * 2. Check if payment was received (via transaction status)
 * 3. If still pending, verify with Razorpay API
 * 4. Handle expired/missed webhook cases:
 *    - If paid but webhook missed: Update DB and trigger notification
 *    - If expired: Mark transaction as EXPIRED
 *
 * This function is fire-and-forget - it doesn't wait for the workflow to complete.
 *
 * Local Development:
 * - Requires running: npx @upstash/qstash-cli dev
 * - Set QSTASH_URL=http://127.0.0.1:8080 in .env.local
 */
export async function triggerPaymentLinkWorkflow(data: PaymentLinkWorkflowData): Promise<void> {
  if (!shouldEnableWorkflows()) {
    console.log(
      `[DEV] Workflows disabled for payment link ${data.paymentLinkId}. Run 'npx @upstash/qstash-cli dev' to enable.`
    );
    return;
  }

  try {
    const client = new Client({ token: env.QSTASH_TOKEN });
    const baseUrl = getWorkflowBaseUrl();

    const { workflowRunId } = await client.trigger({
      url: `${baseUrl}/api/workflows/payment-link-lifecycle`,
      body: JSON.stringify(data),
      retries: 3,
    });

    console.log(
      `Payment link lifecycle workflow triggered for payment link ${data.paymentLinkId} (runId: ${workflowRunId})`
    );
  } catch (error) {
    console.error(`Error triggering payment link workflow for ${data.paymentLinkId}:`, error);
  }
}

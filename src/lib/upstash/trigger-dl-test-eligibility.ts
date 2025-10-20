import { workflowClient } from '@/lib/upstash/workflow';
import { env } from '@/env';

type DLTestEligibilityData = {
  learningLicenseId: string;
  issueDate: string; // YYYY-MM-DD
};

/**
 * Triggers an Upstash Workflow for DL test eligibility notification.
 * The workflow will sleep for 30 days after LL issue, then send a notification
 * that the client is eligible for their driving test.
 *
 * This function is fire-and-forget - it doesn't wait for the workflow to complete.
 *
 * Local Development:
 * - Requires running: npx @upstash/qstash-cli dev
 * - Set QSTASH_URL=http://127.0.0.1:8080 in .env.local
 */
export async function triggerDLTestEligibilityWorkflow(data: DLTestEligibilityData): Promise<void> {
  try {
    const { workflowRunId } = await workflowClient.trigger({
      url: `${env.NEXT_PUBLIC_APP_URL}/api/workflows/dl-test-eligibility`,
      body: JSON.stringify(data),
      retries: 3,
    });

    console.log(
      `DL test eligibility workflow triggered for learning license ${data.learningLicenseId} (runId: ${workflowRunId})`
    );
  } catch (error) {
    console.error(
      `Error triggering DL test eligibility workflow for learning license ${data.learningLicenseId}:`,
      error
    );
  }
}

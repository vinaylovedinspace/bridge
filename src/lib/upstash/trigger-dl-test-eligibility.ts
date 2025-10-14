import { Client } from '@upstash/workflow';
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
 */
export async function triggerDLTestEligibilityWorkflow(data: DLTestEligibilityData): Promise<void> {
  try {
    const client = new Client({ token: env.QSTASH_TOKEN });

    const { workflowRunId } = await client.trigger({
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

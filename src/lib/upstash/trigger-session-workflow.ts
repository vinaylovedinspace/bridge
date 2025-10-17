import { Client } from '@upstash/workflow';
import { env } from '@/env';
import { getWorkflowBaseUrl } from './workflow-utils';

type SessionWorkflowData = {
  sessionId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
};

/**
 * Triggers an Upstash Workflow for automatic session status management.
 * The workflow will:
 * 1. Sleep until 1 hour before session, send WhatsApp reminder
 * 2. Sleep until session start time, then update status to IN_PROGRESS
 * 3. Sleep until session end time, then update status to COMPLETED
 *
 * This function is fire-and-forget - it doesn't wait for the workflow to complete.
 *
 * Local Development:
 * - Requires running: npx @upstash/qstash-cli dev
 * - Set QSTASH_URL=http://127.0.0.1:8080 in .env.local
 */
export async function triggerSessionWorkflow(data: SessionWorkflowData): Promise<void> {
  try {
    const client = new Client({ token: env.QSTASH_TOKEN });
    const baseUrl = getWorkflowBaseUrl();

    const { workflowRunId } = await client.trigger({
      url: `${baseUrl}/api/workflows/session-status`,
      body: JSON.stringify(data),
      retries: 3,
    });

    console.log(
      `Session workflow triggered for session ${data.sessionId} (runId: ${workflowRunId})`
    );
  } catch (error) {
    console.error(`Error triggering workflow for session ${data.sessionId}:`, error);
  }
}

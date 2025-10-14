import { env } from '@/env';

type SessionWorkflowData = {
  sessionId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
};

/**
 * Triggers an Upstash Workflow for automatic session status management.
 * The workflow will:
 * 1. Sleep until session start time, then update status to IN_PROGRESS
 * 2. Sleep until session end time, then update status to COMPLETED
 *
 * This function is fire-and-forget - it doesn't wait for the workflow to complete.
 */
export async function triggerSessionWorkflow(data: SessionWorkflowData): Promise<void> {
  try {
    const workflowUrl = `${env.NEXT_PUBLIC_APP_URL}/api/workflows/session-status`;
    const response = await fetch(workflowUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error(
        `Failed to trigger workflow for session ${data.sessionId}: ${response.statusText}`
      );
    }
  } catch (error) {
    console.error(`Error triggering workflow for session ${data.sessionId}:`, error);
  }
}

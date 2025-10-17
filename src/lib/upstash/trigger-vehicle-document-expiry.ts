import { Client } from '@upstash/workflow';
import { env } from '@/env';
import { getWorkflowBaseUrl } from './workflow-utils';

type VehicleDocumentExpiryData = {
  vehicleId: string;
  documentType: 'PUC' | 'INSURANCE' | 'REGISTRATION';
  expiryDate: string; // YYYY-MM-DD
};

/**
 * Triggers an Upstash Workflow for vehicle document expiry notifications.
 * The workflow will send notifications at 30, 7, and 1 day before expiry.
 *
 * This function is fire-and-forget - it doesn't wait for the workflow to complete.
 *
 * Local Development:
 * - Requires running: npx @upstash/qstash-cli dev
 * - Set QSTASH_URL=http://127.0.0.1:8080 in .env.local
 */
export async function triggerVehicleDocumentExpiryWorkflow(
  data: VehicleDocumentExpiryData
): Promise<void> {
  try {
    const client = new Client({ token: env.QSTASH_TOKEN });
    const baseUrl = getWorkflowBaseUrl();

    const { workflowRunId } = await client.trigger({
      url: `${baseUrl}/api/workflows/vehicle-document-expiry`,
      body: JSON.stringify(data),
      retries: 3,
    });

    console.log(
      `Vehicle document expiry workflow triggered for ${data.vehicleId} (${data.documentType}, runId: ${workflowRunId})`
    );
  } catch (error) {
    console.error(
      `Error triggering vehicle document expiry workflow for ${data.vehicleId} (${data.documentType}):`,
      error
    );
  }
}

import { Client } from '@upstash/workflow';
import { env } from '@/env';

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
 */
export async function triggerVehicleDocumentExpiryWorkflow(
  data: VehicleDocumentExpiryData
): Promise<void> {
  try {
    const client = new Client({ token: env.QSTASH_TOKEN });

    const { workflowRunId } = await client.trigger({
      url: `${env.NEXT_PUBLIC_APP_URL}/api/workflows/vehicle-document-expiry`,
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

import { serve } from '@upstash/workflow/nextjs';
import { Client } from '@upstash/qstash';
import { db } from '@/db';
import { VehicleTable } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { env } from '@/env';
import { NotificationService } from '@/lib/notifications/notification-service';

type VehicleDocumentExpiryPayload = {
  vehicleId: string;
  documentType: 'PUC' | 'INSURANCE' | 'REGISTRATION';
  expiryDate: string; // YYYY-MM-DD
};

export const { POST } = serve<VehicleDocumentExpiryPayload>(
  async (context) => {
    const { vehicleId, documentType, expiryDate } = context.requestPayload;

    const expiryDateTime = new Date(expiryDate);
    const thirtyDaysBefore = new Date(expiryDateTime.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysBefore = new Date(expiryDateTime.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayBefore = new Date(expiryDateTime.getTime() - 1 * 24 * 60 * 60 * 1000);

    // Sleep until 30 days before expiry
    await context.sleepUntil('wait-30-days-before', thirtyDaysBefore.getTime());

    // Send 30-day notification
    await context.run('notify-30-days', async () => {
      await sendExpiryNotification(vehicleId, documentType, 30);
    });

    // Sleep until 7 days before expiry
    await context.sleepUntil('wait-7-days-before', sevenDaysBefore.getTime());

    // Send 7-day notification
    await context.run('notify-7-days', async () => {
      await sendExpiryNotification(vehicleId, documentType, 7);
    });

    // Sleep until 1 day before expiry
    await context.sleepUntil('wait-1-day-before', oneDayBefore.getTime());

    // Send 1-day notification
    await context.run('notify-1-day', async () => {
      await sendExpiryNotification(vehicleId, documentType, 1);
    });
  },
  {
    qstashClient: new Client({ token: env.QSTASH_TOKEN, baseUrl: env.QSTASH_URL }),
    verbose: true,
  }
);

async function sendExpiryNotification(
  vehicleId: string,
  documentType: 'PUC' | 'INSURANCE' | 'REGISTRATION',
  daysUntilExpiry: number
) {
  const vehicle = await db.query.VehicleTable.findFirst({
    where: and(eq(VehicleTable.id, vehicleId), isNull(VehicleTable.deletedAt)),
    with: {
      branch: {
        columns: {
          tenantId: true,
          id: true,
        },
      },
    },
  });

  if (!vehicle) {
    console.warn(`Vehicle ${vehicleId} not found or deleted`);
    return;
  }

  const documentTypeMap = {
    PUC: 'PUC' as const,
    INSURANCE: 'Insurance' as const,
    REGISTRATION: 'Registration' as const,
  };

  await NotificationService.notifyVehicleDocumentExpiring({
    tenantId: vehicle.branch.tenantId,
    branchId: vehicle.branchId,
    userId: 'system',
    vehicleNumber: vehicle.number,
    documentType: documentTypeMap[documentType],
    daysUntilExpiry,
    vehicleId: vehicle.id,
  });

  console.log(
    `${documentType} expiry notification sent for vehicle ${vehicleId} (${daysUntilExpiry} days)`
  );
}

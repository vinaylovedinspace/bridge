import { serve } from '@upstash/workflow/nextjs';
import { Client } from '@upstash/qstash';
import { db } from '@/db';
import { LearningLicenseTable, DrivingLicenseTable } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { env } from '@/env';
import { NotificationService } from '@/lib/notifications/notification-service';

type DLTestEligibilityPayload = {
  learningLicenseId: string;
  issueDate: string; // YYYY-MM-DD
};

export const { POST } = serve<DLTestEligibilityPayload>(
  async (context) => {
    const { learningLicenseId, issueDate } = context.requestPayload;

    // Calculate 30 days after LL issue date
    const issueDateObj = new Date(issueDate);
    const eligibilityDate = new Date(issueDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Sleep until 30 days after LL issue
    await context.sleepUntil('wait-for-eligibility', eligibilityDate.getTime());

    // Send eligibility notification
    await context.run('notify-dl-eligibility', async () => {
      const learningLicense = await db.query.LearningLicenseTable.findFirst({
        where: and(
          eq(LearningLicenseTable.id, learningLicenseId),
          isNull(LearningLicenseTable.licenseNumber),
          isNull(LearningLicenseTable.deletedAt)
        ),
        with: {
          client: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              tenantId: true,
              branchId: true,
            },
          },
        },
      });

      // Only send notification if LL still exists and client hasn't got DL yet
      if (learningLicense && learningLicense.client) {
        // Check if client already has driving license
        const hasDrivingLicense = await db.query.DrivingLicenseTable.findFirst({
          where: and(
            eq(DrivingLicenseTable.clientId, learningLicense.clientId),
            isNull(DrivingLicenseTable.licenseNumber),
            isNull(DrivingLicenseTable.deletedAt)
          ),
        });

        if (!hasDrivingLicense) {
          const client = learningLicense.client;
          const clientName = `${client.firstName} ${client.lastName}`;

          await NotificationService.notifyEligibleForDrivingTest({
            tenantId: client.tenantId,
            branchId: client.branchId,
            userId: client.id,
            clientName,
            clientId: client.id,
          });

          console.log(
            `DL test eligibility notification sent for learning license ${learningLicenseId}`
          );
        } else {
          console.log(`Skipping DL eligibility notification - client already has driving license`);
        }
      } else {
        console.warn(
          `Skipping notification for learning license ${learningLicenseId} - license not found or deleted`
        );
      }
    });
  },
  {
    qstashClient: new Client({ token: env.QSTASH_TOKEN }),
    verbose: true,
  }
);

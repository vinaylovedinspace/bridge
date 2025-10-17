import { serve } from '@upstash/workflow/nextjs';
import { db } from '@/db';
import { TransactionTable } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { NotificationService } from '@/lib/notifications/notification-service';
import { qstashClient } from '@/lib/upstash/workflow';

type PaymentNotificationPayload = {
  transactionId: string;
};

export const { POST } = serve<PaymentNotificationPayload>(
  async (context) => {
    const { transactionId } = context.requestPayload;

    // Fetch transaction details
    await context.run('send-payment-notification', async () => {
      const transaction = await db.query.TransactionTable.findFirst({
        where: and(
          eq(TransactionTable.id, transactionId),
          isNull(TransactionTable.deletedAt),
          eq(TransactionTable.transactionStatus, 'SUCCESS')
        ),
        with: {
          payment: {
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
          },
        },
      });

      // Only send notification if transaction is successful
      if (transaction && transaction.payment && transaction.payment.client) {
        const client = transaction.payment.client;
        const clientName = `${client.firstName} ${client.lastName}`;

        await NotificationService.notifyPaymentReceived({
          tenantId: client.tenantId,
          branchId: client.branchId,
          userId: client.id,
          clientName,
          amount: transaction.amount,
          paymentId: transaction.paymentId,
        });

        console.log(`Payment notification sent for transaction ${transactionId}`);
      } else {
        console.warn(
          `Skipping notification for transaction ${transactionId} - transaction not found or not successful`
        );
      }
    });
  },
  {
    qstashClient,
    verbose: true,
  }
);

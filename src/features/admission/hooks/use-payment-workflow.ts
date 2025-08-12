import { inngest } from '@/lib/inngest/client';
import { PaymentTypeEnum } from '@/db/schema/payment/columns';

export async function schedulePaymentReminders(
  paymentId: string,
  paymentType: (typeof PaymentTypeEnum.enumValues)[number],
  firstInstallmentDate?: Date | null,
  secondInstallmentDate?: Date | null,
  paymentDueDate?: Date | null
) {
  try {
    if (paymentType === 'INSTALLMENTS') {
      // Send event to schedule installment reminders
      await inngest.send({
        name: 'payment/installment.created',
        data: {
          paymentId,
          firstInstallmentDate: firstInstallmentDate?.toISOString(),
          secondInstallmentDate: secondInstallmentDate?.toISOString(),
        },
      });
    } else if (paymentType === 'PAY_LATER' && paymentDueDate) {
      // Send event to schedule pay later reminders
      await inngest.send({
        name: 'payment/pay-later.created',
        data: {
          paymentId,
          paymentDueDate: paymentDueDate.toISOString(),
        },
      });
    }
  } catch (error) {
    console.error('Failed to schedule payment reminders:', error);
    // Don't throw error to avoid blocking payment creation
  }
}

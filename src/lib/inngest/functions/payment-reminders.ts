import { inngest } from '@/lib/inngest/client';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { PaymentTable } from '@/db/schema/payment/columns';
import { NotificationService } from '@/lib/notifications/notification-service';
import { addDays, startOfDay, endOfDay } from 'date-fns';

type PaymentReminderEvent = {
  name: 'payment/reminder.scheduled';
  data: {
    paymentId: string;
    type: 'INSTALLMENT_REMINDER' | 'PAY_LATER_REMINDER';
    installmentNumber?: 1 | 2;
    reminderType?: 'before' | 'due' | 'overdue';
  };
};

// Main payment reminder function
export const paymentReminderFunction = inngest.createFunction(
  { id: 'payment-reminder', name: 'Payment Reminder' },
  { event: 'payment/reminder.scheduled' },
  async ({ event, step }) => {
    const { paymentId, type, installmentNumber, reminderType = 'due' } = event.data;

    // Step 1: Fetch payment details
    const payment = await step.run('fetch-payment', async () => {
      const [payment] = await db
        .select()
        .from(PaymentTable)
        .where(eq(PaymentTable.id, paymentId))
        .limit(1);

      return payment;
    });

    if (!payment) {
      console.error(`Payment not found: ${paymentId}`);
      return { success: false, error: 'Payment not found' };
    }

    // Step 2: Check if reminder is still needed
    const shouldSendReminder = await step.run('check-reminder-needed', async () => {
      if (type === 'INSTALLMENT_REMINDER') {
        if (installmentNumber === 1 && payment.firstInstallmentPaid) {
          return false;
        }
        if (installmentNumber === 2 && payment.secondInstallmentPaid) {
          return false;
        }
      } else if (type === 'PAY_LATER_REMINDER') {
        if (payment.paymentStatus === 'FULLY_PAID') {
          return false;
        }
      }
      return true;
    });

    if (!shouldSendReminder) {
      console.log(`Reminder not needed for payment ${paymentId}`);
      return { success: true, message: 'Reminder not needed' };
    }

    // Step 3: Send notification
    await step.run('send-notification', async () => {
      if (type === 'INSTALLMENT_REMINDER' && installmentNumber) {
        const dueDate =
          installmentNumber === 1
            ? payment.firstInstallmentDate
              ? new Date(payment.firstInstallmentDate)
              : null
            : payment.secondInstallmentDate
              ? new Date(payment.secondInstallmentDate)
              : null;

        await NotificationService.notifyInstallmentDue(
          payment.clientId,
          payment.planId,
          paymentId,
          installmentNumber,
          dueDate,
          reminderType === 'overdue'
        );
      } else if (type === 'PAY_LATER_REMINDER' && payment.paymentDueDate) {
        await NotificationService.notifyPayLaterDue(
          payment.clientId,
          payment.planId,
          paymentId,
          new Date(payment.paymentDueDate),
          reminderType === 'overdue'
        );
      }
    });

    return { success: true, message: 'Notification sent successfully' };
  }
);

// Function to schedule follow-up reminders for installments
export const scheduleInstallmentRemindersFunction = inngest.createFunction(
  { id: 'schedule-installment-reminders', name: 'Schedule Installment Reminders' },
  { event: 'payment/installment.created' },
  async ({ event, step }) => {
    const { paymentId, firstInstallmentDate, secondInstallmentDate } = event.data;

    // Schedule first installment reminders
    if (firstInstallmentDate) {
      const dueDate = new Date(firstInstallmentDate);

      // 3 days before
      await step.sendEvent('schedule-first-installment-before', {
        name: 'payment/reminder.scheduled',
        data: {
          paymentId,
          type: 'INSTALLMENT_REMINDER',
          installmentNumber: 1,
          reminderType: 'before',
        },
        ts: addDays(dueDate, -3).getTime(),
      });

      // On due date
      await step.sendEvent('schedule-first-installment-due', {
        name: 'payment/reminder.scheduled',
        data: {
          paymentId,
          type: 'INSTALLMENT_REMINDER',
          installmentNumber: 1,
          reminderType: 'due',
        },
        ts: startOfDay(dueDate).getTime(),
      });

      // Overdue reminders (1, 3, 7 days after)
      for (const days of [1, 3, 7]) {
        await step.sendEvent(`schedule-first-installment-overdue-${days}d`, {
          name: 'payment/reminder.scheduled',
          data: {
            paymentId,
            type: 'INSTALLMENT_REMINDER',
            installmentNumber: 1,
            reminderType: 'overdue',
          },
          ts: addDays(endOfDay(dueDate), days).getTime(),
        });
      }
    }

    // Schedule second installment reminders
    if (secondInstallmentDate) {
      const dueDate = new Date(secondInstallmentDate);

      // 3 days before
      await step.sendEvent('schedule-second-installment-before', {
        name: 'payment/reminder.scheduled',
        data: {
          paymentId,
          type: 'INSTALLMENT_REMINDER',
          installmentNumber: 2,
          reminderType: 'before',
        },
        ts: addDays(dueDate, -3).getTime(),
      });

      // On due date
      await step.sendEvent('schedule-second-installment-due', {
        name: 'payment/reminder.scheduled',
        data: {
          paymentId,
          type: 'INSTALLMENT_REMINDER',
          installmentNumber: 2,
          reminderType: 'due',
        },
        ts: startOfDay(dueDate).getTime(),
      });

      // Overdue reminders (1, 3, 7 days after)
      for (const days of [1, 3, 7]) {
        await step.sendEvent(`schedule-second-installment-overdue-${days}d`, {
          name: 'payment/reminder.scheduled',
          data: {
            paymentId,
            type: 'INSTALLMENT_REMINDER',
            installmentNumber: 2,
            reminderType: 'overdue',
          },
          ts: addDays(endOfDay(dueDate), days).getTime(),
        });
      }
    }

    return { success: true, message: 'Installment reminders scheduled' };
  }
);

// Function to schedule pay later reminders
export const schedulePayLaterRemindersFunction = inngest.createFunction(
  { id: 'schedule-pay-later-reminders', name: 'Schedule Pay Later Reminders' },
  { event: 'payment/pay-later.created' },
  async ({ event, step }) => {
    const { paymentId, paymentDueDate } = event.data;

    if (!paymentDueDate) {
      return { success: false, error: 'No due date provided' };
    }

    const dueDate = new Date(paymentDueDate);

    // Schedule reminders: 7 days before, 3 days before, on due date, and overdue (1, 3, 7 days)
    const schedule = [
      { days: -7, label: '7d-before', type: 'before' },
      { days: -3, label: '3d-before', type: 'before' },
      { days: 0, label: 'due-date', type: 'due' },
      { days: 1, label: '1d-overdue', type: 'overdue' },
      { days: 3, label: '3d-overdue', type: 'overdue' },
      { days: 7, label: '7d-overdue', type: 'overdue' },
    ];

    for (const { days, label, type } of schedule) {
      const reminderDate =
        days >= 0 ? addDays(endOfDay(dueDate), days) : addDays(startOfDay(dueDate), days);

      await step.sendEvent(`schedule-pay-later-${label}`, {
        name: 'payment/reminder.scheduled',
        data: {
          paymentId,
          type: 'PAY_LATER_REMINDER',
          reminderType: type as 'before' | 'due' | 'overdue',
        },
        ts: reminderDate.getTime(),
      });
    }

    return { success: true, message: 'Pay later reminders scheduled' };
  }
);

export type { PaymentReminderEvent };

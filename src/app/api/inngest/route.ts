import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { env } from '@/env';
import {
  paymentReminderFunction,
  scheduleInstallmentRemindersFunction,
  schedulePayLaterRemindersFunction,
} from '@/lib/inngest/functions/payment-reminders';

// Create an API that serves zero or more Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    paymentReminderFunction,
    scheduleInstallmentRemindersFunction,
    schedulePayLaterRemindersFunction,
  ],
  signingKey: env.INNGEST_SIGNING_KEY,
});

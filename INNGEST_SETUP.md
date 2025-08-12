# Inngest Payment Reminders Setup

This document explains how to set up Inngest for automated payment reminders in the driving school management system.

## Environment Variables

Add these environment variables to your `.env` file:

```env
INNGEST_EVENT_KEY="your_inngest_event_key"
INNGEST_SIGNING_KEY="your_inngest_signing_key"
```

## How It Works

### Payment Reminder System

The system automatically schedules payment reminders when new payments are created:

1. **Installment Payments**:

   - Reminder 3 days before due date
   - Reminder on due date
   - Overdue reminders: 1, 3, and 7 days after due date

2. **Pay Later Payments**:
   - Reminder 7 days before due date
   - Reminder 3 days before due date
   - Reminder on due date
   - Overdue reminders: 1, 3, and 7 days after due date

### Inngest Functions

The system includes three main Inngest functions:

1. **`paymentReminderFunction`** - Sends individual payment reminders
2. **`scheduleInstallmentRemindersFunction`** - Schedules all reminders for installment payments
3. **`schedulePayLaterRemindersFunction`** - Schedules all reminders for pay-later payments

### API Endpoint

Inngest functions are served at `/api/inngest` which handles:

- Function registration with Inngest
- Event processing
- Webhook verification

### Integration Points

- **Payment Creation**: When a payment is created in `upsertPaymentInDB()`, it automatically triggers the appropriate reminder scheduling
- **Notification System**: Uses the existing `NotificationService` to create notifications
- **Database**: Checks payment status before sending reminders to avoid unnecessary notifications

## Development Setup

1. Install Inngest CLI: `npm install -g inngest`
2. Start the dev server: `inngest dev` (in a separate terminal)
3. Your Next.js app should connect automatically to the local Inngest instance

## Production Setup

1. Create an Inngest account at https://inngest.com
2. Set your environment variables
3. Deploy your app - Inngest will automatically register your functions

## Testing

The system will only send reminders if:

- Payment is not already fully paid
- Installments are not already paid
- Due dates are in the future (for scheduling)

Reminders are smart and check payment status before sending to avoid spam.

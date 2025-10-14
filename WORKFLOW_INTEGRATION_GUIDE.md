# Upstash Workflow Integration Guide

This guide explains how to integrate the new Upstash Workflows for in-app notifications.

## Overview

Three new workflows have been created to automatically send in-app notifications:

1. **Payment Notifications** - When payment links are paid successfully
2. **Vehicle Document Expiry** - 30, 7, and 1 day before document expiry
3. **DL Test Eligibility** - 30 days after learning license is issued

## Workflow Files

### API Routes (Workflow Handlers)

- [src/app/api/workflows/payment-notification/route.ts](src/app/api/workflows/payment-notification/route.ts)
- [src/app/api/workflows/vehicle-document-expiry/route.ts](src/app/api/workflows/vehicle-document-expiry/route.ts)
- [src/app/api/workflows/dl-test-eligibility/route.ts](src/app/api/workflows/dl-test-eligibility/route.ts)

### Trigger Functions

- [src/lib/upstash/trigger-payment-notification.ts](src/lib/upstash/trigger-payment-notification.ts)
- [src/lib/upstash/trigger-vehicle-document-expiry.ts](src/lib/upstash/trigger-vehicle-document-expiry.ts)
- [src/lib/upstash/trigger-dl-test-eligibility.ts](src/lib/upstash/trigger-dl-test-eligibility.ts)

## Integration Points

### 1. Payment Notifications ⚠️ NOT YET INTEGRATED

**Status:** Workflow created but **NOT integrated** - waiting for payment gateway implementation

**When to trigger:** After a transaction is successfully created with `transactionStatus: 'SUCCESS'`

**Where to add:**
Currently, **NO TransactionTable entries are being created** in the codebase. You'll need to integrate this when you implement:

- Payment gateway webhooks/callbacks
- Payment link status updates (currently stubbed with TODOs in [src/server/action/payments.ts](src/server/action/payments.ts))
- Any location where payment transactions are recorded

**Example integration:**

```typescript
import { triggerPaymentNotification } from '@/lib/upstash/trigger-payment-notification';

// After creating a successful transaction
const [transaction] = await db
  .insert(TransactionTable)
  .values({
    // ... transaction data
    transactionStatus: 'SUCCESS',
  })
  .returning();

// Trigger notification workflow (fire-and-forget)
await triggerPaymentNotification({
  transactionId: transaction.id,
});
```

### 2. Vehicle Document Expiry Notifications ✅ INTEGRATED

**Status:** Fully integrated in vehicle creation and update

**Integrated in:**

- ✅ [src/features/vehicles/server/db.ts](src/features/vehicles/server/db.ts) - `addVehicle()` and `updateVehicle()` functions

**How it works:**

- When a vehicle is created or updated with expiry dates (PUC, Insurance, Registration)
- Workflows are automatically triggered for each document type
- Notifications will be sent at 30, 7, and 1 day before expiry

**Code reference:**

```typescript
import { triggerVehicleDocumentExpiryWorkflow } from '@/lib/upstash/trigger-vehicle-document-expiry';

// After creating/updating vehicle
const [vehicle] = await db
  .insert(VehicleTable)
  .values({
    // ... vehicle data
    pucExpiry: '2025-12-31',
    insuranceExpiry: '2025-11-30',
    registrationExpiry: '2026-01-15',
  })
  .returning();

// Trigger workflows for each expiry date
if (vehicle.pucExpiry) {
  await triggerVehicleDocumentExpiryWorkflow({
    vehicleId: vehicle.id,
    documentType: 'PUC',
    expiryDate: vehicle.pucExpiry,
  });
}

if (vehicle.insuranceExpiry) {
  await triggerVehicleDocumentExpiryWorkflow({
    vehicleId: vehicle.id,
    documentType: 'INSURANCE',
    expiryDate: vehicle.insuranceExpiry,
  });
}

if (vehicle.registrationExpiry) {
  await triggerVehicleDocumentExpiryWorkflow({
    vehicleId: vehicle.id,
    documentType: 'REGISTRATION',
    expiryDate: vehicle.registrationExpiry,
  });
}
```

### 3. DL Test Eligibility Notifications ✅ INTEGRATED

**Status:** Fully integrated in learning license creation and updates

**Integrated in:**

- ✅ [src/features/enrollment/server/db.ts](src/features/enrollment/server/db.ts) - `upsertLearningLicenseInDB()` function
- ✅ [src/features/clients/server/action.ts](src/features/clients/server/action.ts) - `updateClientLearningLicense()` function

**How it works:**

- When a learning license is created or updated with an `issueDate`
- Workflow is automatically triggered
- After 30 days, notification will be sent that client is eligible for DL test
- Workflow checks if client already has DL before sending notification

**Code reference:**

```typescript
import { triggerDLTestEligibilityWorkflow } from '@/lib/upstash/trigger-dl-test-eligibility';

// After learning license is issued (issueDate is set)
const [learningLicense] = await db
  .insert(LearningLicenseTable)
  .values({
    // ... learning license data
    issueDate: '2025-01-15', // YYYY-MM-DD
    licenseNumber: 'MH1220250012345',
  })
  .returning();

// Trigger DL eligibility workflow
if (learningLicense.issueDate) {
  await triggerDLTestEligibilityWorkflow({
    learningLicenseId: learningLicense.id,
    issueDate: learningLicense.issueDate,
  });
}
```

## Important Notes

### Workflow Updates

If you need to update expiry dates or cancel workflows:

- **Vehicle documents**: When expiry dates change, trigger a new workflow (old one will still run but notification will check if vehicle exists)
- **Learning licenses**: If LL is cancelled, the workflow will check if LL exists before sending notification
- Workflows are stateless - they validate data before sending notifications

### Timezone Considerations

- All dates are stored as YYYY-MM-DD strings to avoid timezone issues
- Workflows convert to Date objects and schedule based on UTC
- Notifications are sent at midnight UTC on the scheduled day

### Testing

To test workflows:

1. Use dates close to current time for testing (e.g., tomorrow for 30-day notification)
2. Check workflow execution in Upstash QStash dashboard
3. Verify notifications appear in the app's notification bell

### Cron Job Deprecation

The existing cron job in [src/app/api/notifications/check/route.ts](src/app/api/notifications/check/route.ts) handles:

- Vehicle document expiry (at 30, 7, 1 days before)
- DL test eligibility (at 30 days after LL issue)

With these workflows, you can:

1. Keep the cron as a backup/fallback
2. OR remove the cron functions for vehicle documents and DL eligibility since workflows handle them proactively
3. The payment notification is NEW and doesn't conflict with the cron

## Integration Summary

### ✅ Completed Integrations

1. **Vehicle Document Expiry Notifications** - Fully integrated in [src/features/vehicles/server/db.ts](src/features/vehicles/server/db.ts)
2. **DL Test Eligibility Notifications** - Fully integrated in [src/features/enrollment/server/db.ts](src/features/enrollment/server/db.ts) and [src/features/clients/server/action.ts](src/features/clients/server/action.ts)

### ⚠️ Pending Integration

1. **Payment Notifications** - Waiting for payment gateway/transaction implementation

## Next Steps

1. ✅ ~~Integrate vehicle workflow~~ - **DONE**
2. ✅ ~~Integrate LL workflow~~ - **DONE**
3. **Implement payment gateway** - Create TransactionTable entries when payments are received
4. **Integrate payment notification** - Add trigger when transaction status is SUCCESS
5. **Test workflows** - Create test data and verify notifications:
   - Create a vehicle with expiry dates in the near future
   - Issue a learning license and wait for notification (or test with past date + 30 days)
   - Test payment notification once gateway is implemented
6. **Monitor QStash dashboard** - Check for failed workflows and debug issues at [QStash Console](https://console.upstash.com/qstash)

## Benefits Over Cron

- ✅ **Proactive**: Scheduled when entity is created, not checked hourly
- ✅ **Efficient**: No database polling needed
- ✅ **Scalable**: QStash handles timing and retries
- ✅ **Reliable**: Built-in retry logic for failed notifications
- ✅ **Precise**: Exact timing instead of hourly checks

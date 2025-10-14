# Upstash Workflow Integration - Summary

## ✅ What Was Implemented

### 1. Workflow API Routes (3 workflows)

- **[Payment Notification](src/app/api/workflows/payment-notification/route.ts)** - Sends notification when payment transaction is successful
- **[Vehicle Document Expiry](src/app/api/workflows/vehicle-document-expiry/route.ts)** - Sends notifications at 30, 7, and 1 day before expiry
- **[DL Test Eligibility](src/app/api/workflows/dl-test-eligibility/route.ts)** - Sends notification 30 days after LL is issued

### 2. Trigger Functions (3 functions)

- **[trigger-payment-notification.ts](src/lib/upstash/trigger-payment-notification.ts)**
- **[trigger-vehicle-document-expiry.ts](src/lib/upstash/trigger-vehicle-document-expiry.ts)**
- **[trigger-dl-test-eligibility.ts](src/lib/upstash/trigger-dl-test-eligibility.ts)**

### 3. Integration Points

#### ✅ Vehicle Document Expiry - INTEGRATED

**File:** [src/features/vehicles/server/db.ts](src/features/vehicles/server/db.ts)

```typescript
// Integrated in addVehicle() and updateVehicle()
if (vehicle.pucExpiry) {
  await triggerVehicleDocumentExpiryWorkflow({
    vehicleId: vehicle.id,
    documentType: 'PUC',
    expiryDate: vehicle.pucExpiry,
  });
}
// Same for insuranceExpiry and registrationExpiry
```

**What happens:**

- When you create/update a vehicle with expiry dates
- Workflows automatically schedule notifications for 30, 7, 1 days before each expiry
- In-app notifications appear in the notification bell

#### ✅ DL Test Eligibility - INTEGRATED

**Files:**

- [src/features/enrollment/server/db.ts](src/features/enrollment/server/db.ts) - `upsertLearningLicenseInDB()`
- [src/features/clients/server/action.ts](src/features/clients/server/action.ts) - `updateClientLearningLicense()`

```typescript
// Integrated in upsertLearningLicenseInDB()
if (license.issueDate) {
  await triggerDLTestEligibilityWorkflow({
    learningLicenseId: license.id,
    issueDate: license.issueDate,
  });
}
```

**What happens:**

- When you create/update a learning license with an issue date
- Workflow sleeps for 30 days
- After 30 days, sends in-app notification that client is eligible for DL test
- Checks if client already has DL before notifying (won't duplicate if DL was already issued)

#### ⚠️ Payment Notification - NOT INTEGRATED YET

**Reason:** No `TransactionTable` entries are currently being created in the codebase.

**When to integrate:**

- When you implement payment gateway webhooks (Paytm, Razorpay, PhonePe, Cashfree, etc.)
- When you implement payment link callbacks
- In [src/server/action/payments.ts](src/server/action/payments.ts) after TODO items are completed

**How to integrate:**

```typescript
import { triggerPaymentNotification } from '@/lib/upstash/trigger-payment-notification';

// After creating a successful transaction
const [transaction] = await db
  .insert(TransactionTable)
  .values({
    paymentId: paymentId,
    amount: amount,
    transactionStatus: 'SUCCESS',
    // ... other fields
  })
  .returning();

await triggerPaymentNotification({
  transactionId: transaction.id,
});
```

## 📋 Testing Checklist

### Test Vehicle Document Expiry

1. Go to Vehicles section
2. Create a new vehicle
3. Set expiry dates:
   - PUC Expiry: (30 days from now)
   - Insurance Expiry: (31 days from now)
   - Registration Expiry: (32 days from now)
4. Save vehicle
5. Check QStash dashboard to verify workflows were triggered
6. Wait for notifications (or set test dates closer for faster testing)

### Test DL Test Eligibility

1. Go to Enrollment or Client Details
2. Create/update a learning license
3. Set Issue Date: (today's date or test with past date)
4. Save learning license
5. Check QStash dashboard to verify workflow was triggered
6. For testing: Use a date 30 days in the past to get immediate notification
7. Verify notification appears after 30 days

### Test Payment Notification (Future)

1. Implement payment gateway
2. Create a transaction with status 'SUCCESS'
3. Trigger the payment notification
4. Verify notification appears in notification bell

## 🔍 Monitoring

### QStash Dashboard

- URL: https://console.upstash.com/qstash
- View all triggered workflows
- Check workflow status (pending, running, completed, failed)
- Debug failed workflows
- View workflow logs

### Database Verification

```sql
-- Check if workflows were triggered (check QStash dashboard)

-- Verify vehicles have expiry dates
SELECT id, number, puc_expiry, insurance_expiry, registration_expiry
FROM vehicles
WHERE deleted_at IS NULL;

-- Verify learning licenses have issue dates
SELECT id, client_id, issue_date, license_number
FROM learning_licenses
WHERE deleted_at IS NULL AND issue_date IS NOT NULL;

-- Check notifications (after they're sent)
SELECT * FROM notifications
WHERE type IN ('VEHICLE_DOCUMENT_EXPIRING', 'ELIGIBLE_FOR_DRIVING_TEST', 'PAYMENT_RECEIVED')
ORDER BY created_at DESC;
```

## 🎯 Key Benefits

1. **Proactive vs Reactive** - Workflows scheduled when entity is created, not polled hourly
2. **Efficient** - No database polling, reduced server load
3. **Scalable** - QStash handles scheduling and retries
4. **Reliable** - Built-in retry logic for failed notifications
5. **Precise Timing** - Exact notification times instead of hourly checks
6. **Fire-and-Forget** - Trigger functions don't block your application

## 📝 Important Notes

### Workflow Behavior

- Workflows are **stateless** - they validate data exists before sending notifications
- If a vehicle is deleted, the workflow will check and skip notification
- If a client already has DL, the eligibility workflow will skip notification
- Old workflows continue running even if you trigger new ones (they check current state)

### Timezone Handling

- All dates stored as YYYY-MM-DD strings (no timezone issues)
- Workflows convert to Date objects and schedule in UTC
- Notifications sent at midnight UTC on scheduled day

### Cron Job Consideration

The existing cron job in [src/app/api/notifications/check/route.ts](src/app/api/notifications/check/route.ts) also checks for:

- Vehicle document expiry
- DL test eligibility

**Options:**

1. **Keep cron as backup** - Redundant but safe fallback
2. **Remove duplicate cron logic** - Clean up since workflows handle it proactively
3. **Hybrid approach** - Keep cron for missed workflows (recommended)

## 🚀 What's Next

1. ✅ Vehicle workflows - DONE
2. ✅ DL eligibility workflows - DONE
3. ⏳ Payment gateway integration - TODO
4. ⏳ Payment notification integration - TODO
5. 🧪 Test all workflows with real data
6. 📊 Monitor QStash dashboard for issues
7. 🎨 (Optional) Customize notification messages
8. 🔄 (Optional) Add workflow cancellation logic if entities are deleted

## 📞 Support

If workflows aren't triggering:

1. Check `QSTASH_TOKEN` in environment variables
2. Verify `NEXT_PUBLIC_APP_URL` is set correctly
3. Check QStash dashboard for errors
4. Review workflow logs in QStash console
5. Ensure dates are in the future (workflows can't schedule in the past)

---

**All TypeScript checks and linting passed ✅**

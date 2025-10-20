# DateTime Timezone Fix

## Problem

When using the `DateTimePicker` component to select a time (e.g., 11:00 AM IST), the time was being stored incorrectly in the database (e.g., 05:30) due to timezone conversion issues between client and server.

## Root Cause

1. User selects 11:00 AM in browser (IST timezone)
2. `DateTimePicker` creates a Date object: `new Date(2025, 9, 19, 11, 0, 0, 0)`
3. When sending to server action, Date gets serialized to ISO string using UTC
4. Server receives: `"2025-10-19T05:30:00.000Z"` (11:00 AM IST = 05:30 AM UTC)
5. Server extracts time using `getHours()` → Returns 5 (in server's UTC timezone)
6. Database stores: 05:30 instead of 11:00

## Solution

Extract date and time as separate strings **before** sending to server actions to avoid timezone conversion during serialization.

### Implementation

#### 1. Utility Function

Created `extractDateTimeStrings()` in `/src/lib/date-time-utils.ts`:

```typescript
export const extractDateTimeStrings = (date: Date): { dateString: string; timeString: string } => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return {
    dateString: `${year}-${month}-${day}`,
    timeString: `${hours}:${minutes}`,
  };
};
```

#### 2. Client Side (Form Submission)

Extract date/time strings in the browser before sending to server:

```typescript
import { extractDateTimeStrings } from '@/lib/date-time-utils';

const { dateString, timeString } = extractDateTimeStrings(data.joiningDate);

const planInput = {
  ...data,
  joiningDateString: dateString,
  joiningTimeString: timeString,
};

await upsertPlanWithPayment(planInput, paymentInput);
```

#### 3. Server Side (Server Action)

Accept optional string parameters and use them if provided:

```typescript
export const upsertPlanWithPayment = async (
  unsafePlanData: PlanValues & {
    joiningDateString?: string;
    joiningTimeString?: string;
  },
  unsafePaymentData: PaymentValues
) => {
  // Use string values if provided (avoids timezone conversion)
  const joiningDate =
    unsafePlanData.joiningDateString || formatDateToYYYYMMDD(unsafePlanData.joiningDate);
  const joiningTime =
    unsafePlanData.joiningTimeString || formatTimeString(unsafePlanData.joiningDate);

  // ... rest of implementation
};
```

## Files Modified

### Core Utility

- `/src/lib/date-time-utils.ts` - Added `extractDateTimeStrings()` function

### Enrollment Feature

- `/src/features/enrollment/hooks/use-upsert-enrollment-form.ts` - Extract date/time before sending
- `/src/features/enrollment/server/action.ts` - Accept optional date/time strings

### Expenses Feature

- `/src/features/expenses/components/form.tsx` - Extract date/time before sending
- `/src/features/expenses/server/action.ts` - Accept optional date/time strings

## Benefits

1. ✅ **Timezone-safe**: Time stored exactly as user selects it
2. ✅ **Backward compatible**: Falls back to Date object if strings not provided
3. ✅ **Reusable**: Utility function can be used anywhere DateTimePicker is used
4. ✅ **Type-safe**: TypeScript-friendly with optional parameters

## Usage Guidelines

**Always use `extractDateTimeStrings()` when:**

- Sending Date values from DateTimePicker to server actions
- Working with time-sensitive data where exact time matters
- Avoiding timezone conversion between client and server

**Example:**

```typescript
// ❌ Bad - Will cause timezone issues
await serverAction({ datetime: dateObject });

// ✅ Good - Timezone-safe
const { dateString, timeString } = extractDateTimeStrings(dateObject);
await serverAction({
  datetime: dateObject,
  dateString,
  timeString,
});
```

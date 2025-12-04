-- Migration: Remove Razorpay payment gateway
-- This migration:
-- 1. Updates existing RAZORPAY transactions to SETU
-- 2. Removes RAZORPAY from payment_gateway enum
-- 3. Drops razorpay_payment_id column

-- Step 1: Update existing RAZORPAY gateway references to SETU
-- (Preserves transaction history)
UPDATE "transactions"
SET "payment_gateway" = 'SETU'
WHERE "payment_gateway" = 'RAZORPAY';

-- Step 2: Remove RAZORPAY from enum
-- PostgreSQL doesn't support removing enum values directly
-- Need to create new enum and migrate

-- Create new enum without RAZORPAY
CREATE TYPE "payment_gateway_new" AS ENUM ('SETU');

-- Alter column to use new enum
ALTER TABLE "transactions"
  ALTER COLUMN "payment_gateway" TYPE "payment_gateway_new"
  USING "payment_gateway"::text::"payment_gateway_new";

-- Drop old enum
DROP TYPE "payment_gateway";

-- Rename new enum to original name
ALTER TYPE "payment_gateway_new" RENAME TO "payment_gateway";

-- Step 3: Drop razorpay_payment_id column
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "razorpay_payment_id";

-- Note: Keeping other payment_link_* columns as they're used by Setu too

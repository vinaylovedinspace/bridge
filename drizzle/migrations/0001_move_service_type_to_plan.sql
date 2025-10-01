-- Migration: Move serviceType from clients to plans table
-- Step 1: Add serviceType column to plans table (with default value to allow NULL initially)
ALTER TABLE "plans" ADD COLUMN "serviceType" "service_type";

-- Step 2: Migrate data from clients to plans
UPDATE "plans"
SET "serviceType" = "clients"."serviceType"
FROM "clients"
WHERE "plans"."clientId" = "clients"."id";

-- Step 3: Set default for plans that don't have a client match (shouldn't happen, but just in case)
UPDATE "plans"
SET "serviceType" = 'FULL_SERVICE'
WHERE "serviceType" IS NULL;

-- Step 4: Make serviceType NOT NULL now that all values are set
ALTER TABLE "plans" ALTER COLUMN "serviceType" SET NOT NULL;

-- Step 5: Remove serviceType column from clients table
ALTER TABLE "clients" DROP COLUMN "serviceType";

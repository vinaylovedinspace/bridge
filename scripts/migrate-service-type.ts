import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function migrateServiceType() {
  console.log('Starting migration: Moving serviceType from clients to plans...');

  try {
    // Step 1: Add service_type column to plans table (nullable first)
    console.log('Step 1: Adding service_type column to plans table...');
    await db.execute(
      sql`ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "service_type" "service_type"`
    );

    // Step 2: Migrate data from clients to plans
    console.log('Step 2: Migrating data from clients to plans...');
    await db.execute(sql`
      UPDATE "plans"
      SET "service_type" = "clients"."serviceType"
      FROM "clients"
      WHERE "plans"."client_id" = "clients"."id"
      AND "plans"."service_type" IS NULL
    `);

    // Step 3: Set default for plans that don't have a client match
    console.log('Step 3: Setting defaults for unmapped plans...');
    await db.execute(sql`
      UPDATE "plans"
      SET "service_type" = 'FULL_SERVICE'
      WHERE "service_type" IS NULL
    `);

    // Step 4: Make service_type NOT NULL
    console.log('Step 4: Making service_type NOT NULL...');
    await db.execute(sql`ALTER TABLE "plans" ALTER COLUMN "service_type" SET NOT NULL`);

    // Step 5: Remove serviceType from clients table
    console.log('Step 5: Removing serviceType from clients table...');
    await db.execute(sql`ALTER TABLE "clients" DROP COLUMN IF EXISTS "serviceType"`);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

migrateServiceType()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

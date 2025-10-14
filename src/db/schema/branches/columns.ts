import { pgTable, text, timestamp, uuid, json, integer } from 'drizzle-orm/pg-core';
import { DEFAULT_WORKING_DAYS, DEFAULT_OPERATING_HOURS } from '@/lib/constants/business';

export const BranchTable = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),

  orgId: text('org_id').notNull().unique(), // from clerk

  // Working days and operating hours configuration
  workingDays: json('working_days').$type<Array<number>>().default(DEFAULT_WORKING_DAYS).notNull(), // 0=Sunday, 6=Saturday (all days by default)
  operatingHours: json('operating_hours')
    .$type<{ start: string; end: string }>()
    .default(DEFAULT_OPERATING_HOURS)
    .notNull(),

  // Service charges configuration
  licenseServiceCharge: integer('license_service_charge').default(500).notNull(), // Charge for handling license process

  // Default RTO office for this branch
  defaultRtoOffice: text('default_rto_office'), // RTO office name (e.g., 'Mumbai South RTO')

  tenantId: uuid('tenant_id').notNull(),
  createdBy: text('created_by').notNull(),

  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
});

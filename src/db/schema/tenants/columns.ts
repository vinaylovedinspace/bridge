import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const TenantTable = pgTable('tenant', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ownerId: text('owner_id').notNull(),
  whatsappNumber: text('whatsapp_number'),
  licenceNumber: text('licence_number'),
  address: text('address'),
  licenseIssueDate: text('license_issue_date'),

  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

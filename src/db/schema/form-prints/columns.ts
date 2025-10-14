import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const formPrints = pgTable('form_prints', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull(),
  formType: varchar('form_type', { length: 50 }).notNull(),
  printedAt: timestamp('printed_at', { withTimezone: true }).defaultNow().notNull(),
  printedBy: varchar('printed_by', { length: 255 }).notNull(), // Clerk userId
  batchId: uuid('batch_id'), // For bulk operations
  branchId: uuid('branch_id').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type FormPrint = typeof formPrints.$inferSelect;
export type InsertFormPrint = typeof formPrints.$inferInsert;

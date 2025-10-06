import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const ExpenseTable = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  amount: integer('amount').notNull(),
  description: text('description'),
  expenseDate: timestamp('expense_date', { mode: 'date' }).notNull(), // Date and time of expense
  staffId: uuid('staff_id').notNull(), // Reference to staff member who took the money

  branchId: uuid('branch_id').notNull(),

  createdBy: text('created_by').notNull(),

  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
});

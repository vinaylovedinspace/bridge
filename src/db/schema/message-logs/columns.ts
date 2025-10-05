import { pgTable, text, uuid, timestamp, integer } from 'drizzle-orm/pg-core';
import { ClientTable } from '../client/columns';

export const MessageLogsTable = pgTable('message_logs', {
  id: uuid('id').primaryKey(),
  clientId: uuid('client_id')
    .notNull()
    .references(() => ClientTable.id, { onDelete: 'cascade' }),
  messageType: text('message_type').notNull(), // 'onboarding', 'payment', 'payment_receipt', 'onboarding_with_receipt'
  status: text('status').notNull(), // 'success', 'failure'
  error: text('error'),
  retryCount: integer('retry_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

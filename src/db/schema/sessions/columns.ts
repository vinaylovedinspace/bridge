import { pgEnum, pgTable, timestamp, uuid, date, time, integer, text } from 'drizzle-orm/pg-core';

export const SessionStatusEnum = pgEnum('session_status', [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'RESCHEDULED',
]);

export const SessionTable = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull(),
  vehicleId: uuid('vehicle_id').notNull(),

  sessionDate: date('session_date', { mode: 'date' }).notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),

  status: SessionStatusEnum().default('SCHEDULED').notNull(),

  // For tracking which session this is in the series (1st, 2nd, etc.)
  sessionNumber: integer('session_number').notNull(),

  // Original session ID if this is a rescheduled session
  originalSessionId: uuid('original_session_id'),

  branchId: uuid('branch_id').notNull(),

  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

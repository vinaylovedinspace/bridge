import { pgTable, timestamp, uuid, integer, time, text, pgEnum } from 'drizzle-orm/pg-core';
import { ServiceTypeEnum } from '../enums';

export const PlanEnum = pgEnum('status', [
  'NOT_STARTED',
  'WAITING_FOR_LL_TEST',
  'IN_PROGRESS',
  'WAITING_FOR_DL_TEST',
  'COMPLETED',
]);

export const PlanTable = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  planCode: text('plan_code').notNull(),

  vehicleId: uuid('vehicle_id').notNull(),
  numberOfSessions: integer('number_of_sessions').notNull(),
  sessionDurationInMinutes: integer('session_duration_in_minutes').notNull(),
  joiningDate: text('joining_date').notNull(),
  joiningTime: time('joining_time').notNull(),

  serviceType: ServiceTypeEnum().notNull(),

  clientId: uuid('client_id').notNull(),
  status: PlanEnum().notNull().default('NOT_STARTED'),

  paymentId: uuid('payment_id').unique(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

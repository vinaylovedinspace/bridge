import { pgTable, timestamp, uuid, integer, time, text, pgEnum, index } from 'drizzle-orm/pg-core';

export const PlanEnum = pgEnum('status', [
  'NOT_STARTED',
  'WAITING_FOR_LL_TEST',
  'IN_PROGRESS',
  'WAITING_FOR_DL_TEST',
  'COMPLETED',
]);
export const ServiceTypeEnum = pgEnum('service_type', ['FULL_SERVICE', 'DRIVING_ONLY']);

export const PlanTable = pgTable(
  'plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planCode: text('plan_code').notNull(),

    vehicleId: uuid('vehicle_id').notNull(),
    numberOfSessions: integer('number_of_sessions').notNull(),
    sessionDurationInMinutes: integer('session_duration_in_minutes').notNull(),
    joiningDate: text('joining_date').notNull(),
    joiningTime: time('joining_time').notNull(),
    vehicleRentAmount: integer('vehicle_rent_amount').notNull(),

    serviceType: ServiceTypeEnum().notNull(),

    clientId: uuid('client_id').notNull(),
    status: PlanEnum().notNull().default('NOT_STARTED'),
    completedAt: text('completed_at'),

    paymentId: uuid('payment_id').unique().notNull(),
    branchId: uuid('branch_id').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    // Dashboard performance indexes
    clientServiceIdx: index('idx_plans_client_service').on(
      table.clientId,
      table.serviceType,
      table.branchId
    ),
    paymentBranchIdx: index('idx_plans_payment_branch').on(
      table.paymentId,
      table.branchId,
      table.joiningDate
    ),
  })
);

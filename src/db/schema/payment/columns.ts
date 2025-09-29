import { integer, pgEnum, pgTable, timestamp, uuid, boolean, text } from 'drizzle-orm/pg-core';
import { PaymentModeEnum } from '../transactions/columns';

export const PaymentStatusEnum = pgEnum('payment_status', [
  'PARTIALLY_PAID',
  'FULLY_PAID',
  'PENDING',
]);

export const PaymentTypeEnum = pgEnum('payment_type', ['FULL_PAYMENT', 'INSTALLMENTS']);

export const PaymentTable = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull(),
  planId: uuid('plan_id').notNull().unique(),

  vehicleRentAmount: integer('vehicle_rent_amount').notNull(),
  originalAmount: integer('original_amount').notNull(),
  discount: integer('discount').notNull().default(0),
  finalAmount: integer('final_amount').notNull(),
  licenseServiceFee: integer('license_service_fee').notNull().default(0),
  paymentStatus: PaymentStatusEnum('payment_status').default('PENDING'),
  paymentType: PaymentTypeEnum('payment_type').default('FULL_PAYMENT'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const FullPaymentTable = pgTable('full_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull(),
  paymentDate: text('payment_date'),
  paymentMode: PaymentModeEnum('payment_mode'),
  isPaid: boolean('is_paid').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const InstallmentPaymentTable = pgTable('installment_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull(),
  installmentNumber: integer('installment_number').notNull(), // 1 or 2
  amount: integer('amount').notNull(),
  paymentMode: PaymentModeEnum('payment_mode'),
  paymentDate: text('payment_date'),
  isPaid: boolean('is_paid').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

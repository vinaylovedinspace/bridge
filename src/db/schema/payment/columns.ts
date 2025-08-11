import { integer, pgEnum, pgTable, timestamp, uuid, boolean, text } from 'drizzle-orm/pg-core';
import { PaymentModeEnum } from '../transactions/columns';

export const PaymentStatusEnum = pgEnum('payment_status', [
  'PARTIALLY_PAID',
  'FULLY_PAID',
  'PENDING',
]);

export const PaymentTypeEnum = pgEnum('payment_type', [
  'FULL_PAYMENT',
  'INSTALLMENTS',
  'PAY_LATER',
]);

export const PaymentTable = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull(),
  planId: uuid('plan_id').notNull().unique(),

  originalAmount: integer('original_amount').notNull(),
  discount: integer('discount').notNull().default(0),
  finalAmount: integer('final_amount').notNull(),
  paymentStatus: PaymentStatusEnum('payment_status').default('PENDING'),

  // Payment type (full payment, installments, or pay later)
  paymentType: PaymentTypeEnum('payment_type').default('FULL_PAYMENT'),

  // For full payment (only used when paymentType is FULL_PAYMENT)
  fullPaymentDate: text('full_payment_date'), // YYYY-MM-DD string to avoid timezone issues
  fullPaymentMode: PaymentModeEnum('full_payment_mode'),
  fullPaymentPaid: boolean('full_payment_paid').default(false),

  // For installment payments (only used when paymentType is INSTALLMENTS)
  firstInstallmentAmount: integer('first_installment_amount').default(0),
  firstPaymentMode: PaymentModeEnum('first_payment_mode'),
  firstInstallmentDate: text('first_installment_date'), // YYYY-MM-DD string to avoid timezone issues
  firstInstallmentPaid: boolean('first_installment_paid').default(false),

  secondInstallmentAmount: integer('second_installment_amount').default(0),
  secondPaymentMode: PaymentModeEnum('second_payment_mode'),
  secondInstallmentDate: text('second_installment_date'), // YYYY-MM-DD string to avoid timezone issues
  secondInstallmentPaid: boolean('second_installment_paid').default(false),

  // For pay later (only used when paymentType is PAY_LATER)
  paymentDueDate: text('payment_due_date'), // YYYY-MM-DD string to avoid timezone issues

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  boolean,
  text,
  index,
} from 'drizzle-orm/pg-core';
import { PaymentModeEnum } from '../transactions/columns';

export const PaymentStatusEnum = pgEnum('payment_status', [
  'PARTIALLY_PAID',
  'FULLY_PAID',
  'PENDING',
]);

export const PaymentTypeEnum = pgEnum('payment_type', ['FULL_PAYMENT', 'INSTALLMENTS']);
export type PaymentType = (typeof PaymentTypeEnum.enumValues)[number];
export type PaymentStatus = (typeof PaymentStatusEnum.enumValues)[number];

export const PaymentTable = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id').notNull(),
    branchId: uuid('branch_id').notNull(),

    discount: integer('discount').notNull().default(0),
    totalAmount: integer('total_amount').notNull(),
    licenseServiceFee: integer('license_service_fee').notNull().default(0),
    paymentStatus: PaymentStatusEnum('payment_status').default('PENDING'),
    paymentType: PaymentTypeEnum('payment_type').default('FULL_PAYMENT'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Dashboard performance index
    clientStatusTypeIdx: index('idx_payments_client_status').on(
      table.clientId,
      table.paymentStatus,
      table.paymentType
    ),
  })
);

export const FullPaymentTable = pgTable(
  'full_payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentId: uuid('payment_id').notNull().unique(),
    paymentDate: text('payment_date'),
    paymentMode: PaymentModeEnum('payment_mode'),
    isPaid: boolean('is_paid').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    // Dashboard performance index
    paymentPaidIdx: index('idx_full_payments_payment_paid').on(table.paymentId, table.isPaid),
  })
);

export const InstallmentPaymentTable = pgTable(
  'installment_payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paymentId: uuid('payment_id').notNull(),
    installmentNumber: integer('installment_number').notNull(), // 1 or 2
    amount: integer('amount').notNull(),
    paymentMode: PaymentModeEnum('payment_mode'),
    paymentDate: text('payment_date'),
    isPaid: boolean('is_paid').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    // Composite unique constraint for payment + installment number
    uniquePaymentInstallment: index('idx_installment_payments_unique').on(
      table.paymentId,
      table.installmentNumber
    ),
    // Dashboard performance index
    paymentNumberIdx: index('idx_installment_payments_payment_number').on(
      table.paymentId,
      table.installmentNumber,
      table.isPaid
    ),
  })
);

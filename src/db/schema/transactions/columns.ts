import { integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const PaymentModeEnum = pgEnum('payment_mode', ['QR', 'CASH']);
export type PaymentMode = (typeof PaymentModeEnum.enumValues)[number];

export const TransactionStatusEnum = pgEnum('transaction_status', [
  'SUCCESS',
  'PENDING',
  'FAILED',
  'REFUNDED',
  'CANCELLED',
]);

// Table to track individual payment transactions
// All payments are manual (CASH/QR) - no payment gateways
export const TransactionTable = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull(),
  amount: integer('amount').notNull(),
  paymentMode: PaymentModeEnum('payment_mode').notNull(),
  paymentGateway: text('payment_gateway'), // nullable, kept for historical data
  transactionStatus: TransactionStatusEnum('transaction_status').notNull().default('PENDING'),
  transactionReference: text('transaction_reference'), // For manual payments (UPI ref, etc.)
  notes: text('notes'),
  txnDate: timestamp('txn_date'), // Transaction timestamp
  installmentNumber: integer('installment_number'), // For installment payments
  metadata: jsonb('metadata').notNull().default('{}'), // Payment metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

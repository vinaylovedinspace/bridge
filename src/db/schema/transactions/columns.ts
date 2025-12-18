import { pgTable, text, uuid, integer, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core';

export const PaymentModeEnum = pgEnum('payment_mode', ['PAYMENT_LINK', 'UPI', 'QR', 'CASH']);
export type PaymentMode = (typeof PaymentModeEnum.enumValues)[number];

export const PaymentGatewayEnum = pgEnum('payment_gateway', ['SETU', 'PHONEPE']);
export type PaymentGateway = (typeof PaymentGatewayEnum.enumValues)[number];

export const TransactionStatusEnum = pgEnum('transaction_status', [
  'SUCCESS',
  'PENDING',
  'FAILED',
  'REFUNDED',
  'CANCELLED',
]);

// Table to track individual payment transactions
// Gateway-agnostic design: all gateway-specific data stored in metadata JSONB
export const TransactionTable = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull(),
  amount: integer('amount').notNull(),
  paymentMode: PaymentModeEnum('payment_mode').notNull(),
  paymentGateway: PaymentGatewayEnum('payment_gateway'), // nullable for manual payments
  transactionStatus: TransactionStatusEnum('transaction_status').notNull().default('PENDING'),
  transactionReference: text('transaction_reference'), // For manual payments
  notes: text('notes'),
  txnDate: timestamp('txn_date'), // Transaction timestamp
  installmentNumber: integer('installment_number'), // For installment payments
  metadata: jsonb('metadata').notNull().default('{}'), // Gateway-specific data (links, responses, etc.)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

import { pgTable, text, uuid, integer, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core';

export const PaymentModeEnum = pgEnum('payment_mode', ['PAYMENT_LINK', 'QR', 'CASH']);
export type PaymentMode = (typeof PaymentModeEnum.enumValues)[number];

export const PaymentGatewayEnum = pgEnum('payment_gateway', ['PLACEHOLDER']);

export const TransactionStatusEnum = pgEnum('transaction_status', [
  'SUCCESS',
  'PENDING',
  'FAILED',
  'REFUNDED',
  'CANCELLED',
]);

// Table to track individual payment transactions
export const TransactionTable = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull(),
  amount: integer('amount').notNull(),
  paymentMode: PaymentModeEnum('payment_mode').notNull(),
  transactionReference: text('transaction_reference'),
  transactionStatus: TransactionStatusEnum('transaction_status').notNull().default('PENDING'),
  notes: text('notes'),
  metadata: jsonb('metadata'), // Store any additional gateway-specific data

  // Payment gateway information
  paymentGateway: PaymentGatewayEnum('payment_gateway'),

  // Gateway-agnostic transaction fields
  orderId: text('order_id'), // Our internal order ID sent to gateway
  txnId: text('txn_id'), // Gateway's transaction ID
  merchantId: text('merchant_id'), // Gateway merchant ID
  currency: text('currency').default('INR'),

  // Gateway response details
  bankTxnId: text('bank_txn_id'), // Bank reference number
  bankName: text('bank_name'), // Bank name
  gatewayName: text('gateway_name'), // Gateway provider name
  responseCode: text('response_code'), // Gateway response code
  responseMessage: text('response_message'), // Gateway response message
  checksumHash: text('checksum_hash'), // Transaction verification hash
  txnDate: timestamp('txn_date'), // Gateway transaction timestamp

  // For installment payments
  installmentNumber: integer('installment_number'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

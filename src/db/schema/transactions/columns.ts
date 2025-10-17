import { pgTable, text, uuid, integer, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core';

export const PaymentModeEnum = pgEnum('payment_mode', ['PAYMENT_LINK', 'QR', 'CASH']);
export type PaymentMode = (typeof PaymentModeEnum.enumValues)[number];

export const PaymentGatewayEnum = pgEnum('payment_gateway', ['RAZORPAY']);

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

  // Razorpay Payment Link specific fields
  paymentLinkId: text('payment_link_id'), // Razorpay payment link ID (e.g., plink_xxx)
  paymentLinkUrl: text('payment_link_url'), // Short URL for the payment link
  paymentLinkReferenceId: text('payment_link_reference_id'), // Our reference ID (full_payment.id or installment.id)
  paymentLinkStatus: text('payment_link_status'), // CREATED, ACTIVE, PAID, PARTIALLY_PAID, EXPIRED, CANCELLED
  paymentLinkExpiresAt: timestamp('payment_link_expires_at'), // When the payment link expires
  paymentLinkCreatedAt: timestamp('payment_link_created_at'), // When the payment link was created
  razorpayPaymentId: text('razorpay_payment_id'), // Razorpay payment ID (e.g., pay_xxx) when payment is completed

  // For installment payments
  installmentNumber: integer('installment_number'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

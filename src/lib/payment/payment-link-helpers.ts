import { db } from '@/db';
import { TransactionTable } from '@/db/schema';
import { buildManualPaymentMetadata } from '@/lib/payment/transaction-metadata';

/**
 * Creates a transaction record for manual payments (CASH/QR)
 */
export async function createManualTransactionRecord(params: {
  paymentId: string;
  amount: number;
  paymentMode: 'CASH' | 'QR';
  installmentNumber: number | null;
  transactionReference?: string;
  notes?: string;
  paymentType?: 'FULL_PAYMENT' | 'INSTALLMENTS';
  type?: 'enrollment' | 'rto-service';
}) {
  const metadata = buildManualPaymentMetadata({
    paymentType: params.paymentType,
    type: params.type,
  });

  return await db.insert(TransactionTable).values({
    paymentId: params.paymentId,
    amount: params.amount,
    paymentMode: params.paymentMode,
    paymentGateway: null,
    transactionStatus: 'SUCCESS',
    transactionReference: params.transactionReference,
    notes: params.notes || `Manual ${params.paymentMode} payment recorded`,
    installmentNumber: params.installmentNumber,
    txnDate: new Date(),
    metadata,
  });
}

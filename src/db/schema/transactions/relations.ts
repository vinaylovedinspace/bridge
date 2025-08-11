import { relations } from 'drizzle-orm';
import { PaymentTable } from '../payment/columns';
import { TransactionTable } from './columns';

export const transactionRelations = relations(TransactionTable, ({ one }) => ({
  payment: one(PaymentTable, {
    fields: [TransactionTable.paymentId],
    references: [PaymentTable.id],
  }),
}));

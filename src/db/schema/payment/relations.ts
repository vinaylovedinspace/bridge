import { relations } from 'drizzle-orm';
import { ClientTable } from '../client/columns';
import { PaymentTable, FullPaymentTable, InstallmentPaymentTable } from './columns';
import { PlanTable } from '../plan/columns';

export const paymentRelations = relations(PaymentTable, ({ one, many }) => ({
  client: one(ClientTable, {
    fields: [PaymentTable.clientId],
    references: [ClientTable.id],
  }),
  plan: one(PlanTable, {
    fields: [PaymentTable.planId],
    references: [PlanTable.id],
  }),
  fullPayment: one(FullPaymentTable, {
    fields: [PaymentTable.id],
    references: [FullPaymentTable.paymentId],
  }),
  installmentPayments: many(InstallmentPaymentTable),
}));

export const fullPaymentRelations = relations(FullPaymentTable, ({ one }) => ({
  payment: one(PaymentTable, {
    fields: [FullPaymentTable.paymentId],
    references: [PaymentTable.id],
  }),
}));

export const installmentPaymentRelations = relations(InstallmentPaymentTable, ({ one }) => ({
  payment: one(PaymentTable, {
    fields: [InstallmentPaymentTable.paymentId],
    references: [PaymentTable.id],
  }),
}));

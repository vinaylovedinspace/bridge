import { relations } from 'drizzle-orm';
import { ClientTable } from '../client/columns';
import { PaymentTable, FullPaymentTable, InstallmentPaymentTable } from './columns';
import { PlanTable } from '../plan/columns';
import { RTOServicesTable } from '../rto-services/columns';
import { BranchTable } from '../branches/columns';

export const paymentRelations = relations(PaymentTable, ({ one, many }) => ({
  client: one(ClientTable, {
    fields: [PaymentTable.clientId],
    references: [ClientTable.id],
  }),
  branch: one(BranchTable, {
    fields: [PaymentTable.branchId],
    references: [BranchTable.id],
  }),
  fullPayment: one(FullPaymentTable, {
    fields: [PaymentTable.id],
    references: [FullPaymentTable.paymentId],
  }),
  installmentPayments: many(InstallmentPaymentTable),
  plan: one(PlanTable, {
    fields: [PaymentTable.id],
    references: [PlanTable.paymentId],
  }),
  rtoService: one(RTOServicesTable, {
    fields: [PaymentTable.id],
    references: [RTOServicesTable.paymentId],
  }),
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

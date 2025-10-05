import { relations } from 'drizzle-orm';
import { RTOServicesTable } from './columns';
import { BranchTable } from '../branches/columns';
import { PaymentTable } from '../payment/columns';
import { ClientTable } from '../client/columns';

export const RTOServicesRelations = relations(RTOServicesTable, ({ one, many }) => ({
  client: one(ClientTable, {
    fields: [RTOServicesTable.clientId],
    references: [ClientTable.id],
  }),
  branch: one(BranchTable, {
    fields: [RTOServicesTable.branchId],
    references: [BranchTable.id],
  }),

  payments: many(PaymentTable),
}));

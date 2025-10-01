import { relations } from 'drizzle-orm';
import { VehicleTable } from '../vehicles/columns';
import { PlanTable } from './columns';
import { ClientTable } from '../client/columns';
import { PaymentTable } from '../payment/columns';
import { BranchTable } from '../branches/columns';

export const planRelations = relations(PlanTable, ({ one }) => ({
  vehicle: one(VehicleTable, {
    fields: [PlanTable.vehicleId],
    references: [VehicleTable.id],
  }),
  client: one(ClientTable, {
    fields: [PlanTable.clientId],
    references: [ClientTable.id],
  }),
  payment: one(PaymentTable, {
    fields: [PlanTable.paymentId],
    references: [PaymentTable.id],
  }),
  branch: one(BranchTable, {
    fields: [PlanTable.branchId],
    references: [BranchTable.id],
  }),
}));

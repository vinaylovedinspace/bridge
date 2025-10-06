import { relations } from 'drizzle-orm';
import { ClientTable } from './columns';
import { BranchTable } from '../branches/columns';
import { LearningLicenseTable } from '@/db/schema/learning-licenses/columns';
import { DrivingLicenseTable } from '@/db/schema/driving-licenses/columns';
import { PlanTable } from '../plan/columns';
import { formPrints } from '../form-prints/columns';
import { SessionTable } from '../sessions/columns';
import { RTOServicesTable } from '../rto-services/columns';

export const clientRelations = relations(ClientTable, ({ one, many }) => ({
  branch: one(BranchTable, {
    fields: [ClientTable.branchId],
    references: [BranchTable.id],
  }),
  learningLicense: one(LearningLicenseTable, {
    fields: [ClientTable.id],
    references: [LearningLicenseTable.clientId],
  }),
  drivingLicense: one(DrivingLicenseTable, {
    fields: [ClientTable.id],
    references: [DrivingLicenseTable.clientId],
  }),
  plan: many(PlanTable),
  rtoServices: many(RTOServicesTable),
  formPrints: many(formPrints),
  sessions: many(SessionTable),
}));

import { relations } from 'drizzle-orm';
import { DigilockerVerificationTable } from './columns';
import { BranchTable } from '../branches/columns';
import { TenantTable } from '../tenants/columns';

export const digilockerVerificationRelations = relations(DigilockerVerificationTable, ({ one }) => ({
  branch: one(BranchTable, {
    fields: [DigilockerVerificationTable.branchId],
    references: [BranchTable.id],
  }),
  tenant: one(TenantTable, {
    fields: [DigilockerVerificationTable.tenantId],
    references: [TenantTable.id],
  }),
}));

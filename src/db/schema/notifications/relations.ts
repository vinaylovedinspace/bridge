import { relations } from 'drizzle-orm';
import { notifications } from './columns';
import { TenantTable } from '../tenants/columns';
import { BranchTable } from '../branches/columns';

export const notificationsRelations = relations(notifications, ({ one }) => ({
  tenant: one(TenantTable, {
    fields: [notifications.tenantId],
    references: [TenantTable.id],
  }),
  branch: one(BranchTable, {
    fields: [notifications.branchId],
    references: [BranchTable.id],
  }),
}));

import { relations } from 'drizzle-orm';
import { ExpenseTable } from './columns';
import { StaffTable } from '../staff/columns';
import { BranchTable } from '../branches/columns';

export const ExpenseTableRelations = relations(ExpenseTable, ({ one }) => ({
  staff: one(StaffTable, {
    fields: [ExpenseTable.staffId],
    references: [StaffTable.id],
  }),
  branch: one(BranchTable, {
    fields: [ExpenseTable.branchId],
    references: [BranchTable.id],
  }),
}));

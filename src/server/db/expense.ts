import { db } from '@/db';
import { ExpenseTable } from '@/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { getBranchConfig } from '@/server/actions/branch';

const _getExpenses = async (branchId: string) => {
  const expenses = await db.query.ExpenseTable.findMany({
    where: and(eq(ExpenseTable.branchId, branchId), isNull(ExpenseTable.deletedAt)),
    with: {
      staff: {
        columns: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [desc(ExpenseTable.expenseDate)],
  });

  return expenses;
};

export const getExpenses = async () => {
  const { id: branchId } = await getBranchConfig();

  return await _getExpenses(branchId);
};

const _getExpense = async (id: string) => {
  const expense = await db.query.ExpenseTable.findFirst({
    where: and(eq(ExpenseTable.id, id), isNull(ExpenseTable.deletedAt)),
    with: {
      staff: {
        columns: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return expense;
};

export const getExpense = async (id: string) => {
  return await _getExpense(id);
};

export type Expense = Awaited<ReturnType<typeof getExpenses>>[0];
export type ExpenseDetail = Awaited<ReturnType<typeof getExpense>>;

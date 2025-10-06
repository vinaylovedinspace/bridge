import { db } from '@/db';
import { ExpenseTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const addExpense = async (data: typeof ExpenseTable.$inferInsert) => {
  const [expense] = await db.insert(ExpenseTable).values(data).returning();

  return expense;
};

export const updateExpense = async (id: string, data: typeof ExpenseTable.$inferInsert) => {
  try {
    const [expense] = await db
      .update(ExpenseTable)
      .set(data)
      .where(eq(ExpenseTable.id, id))
      .returning();

    return expense;
  } catch (error) {
    console.log(error);
  }
};

export const deleteExpense = async (id: string, branchId: string) => {
  try {
    const [expense] = await db
      .update(ExpenseTable)
      .set({ deletedAt: new Date() })
      .where(and(eq(ExpenseTable.id, id), eq(ExpenseTable.branchId, branchId)))
      .returning();

    return expense;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

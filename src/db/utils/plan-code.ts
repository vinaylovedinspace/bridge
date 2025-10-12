import { sql, eq } from 'drizzle-orm';
import { db } from '../index';
import { PlanTable } from '../schema';

export async function getNextPlanCode(branchId: string): Promise<string> {
  // Get the max plan code for the branch
  const result = await db
    .select({
      maxCode: sql<number>`COALESCE(MAX(CAST(${PlanTable.planCode} AS INTEGER)), 0)`,
    })
    .from(PlanTable)
    .where(eq(PlanTable.branchId, branchId))
    .execute();

  // Return the next code (current max + 1) formatted with leading zeros for numbers < 3 digits
  const nextCodeNumber = (result[0]?.maxCode ?? 0) + 1;
  return nextCodeNumber.toString().padStart(3, '0');
}

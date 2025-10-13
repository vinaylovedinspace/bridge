import { sql, eq } from 'drizzle-orm';
import { db } from '../index';
import { PlanTable } from '../schema';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';

type DbTransaction = PgTransaction<
  PostgresJsQueryResultHKT,
  Record<string, never>,
  ExtractTablesWithRelations<Record<string, never>>
>;

export async function getNextPlanCode(branchId: string, tx?: DbTransaction): Promise<string> {
  const executor = tx ?? db;

  // Get the max plan code for the branch
  const result = await executor
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

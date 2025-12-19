import { db } from '@/db';
import { TransactionTable, ClientTable } from '@/db/schema';
import { and, or, ilike, gte, lte, desc, isNull } from 'drizzle-orm';
import { getBranchConfig } from '@/server/action/branch';

const _getTransactions = async (
  branchId: string,
  name?: string,
  startDate?: string,
  endDate?: string
) => {
  const conditions = [isNull(TransactionTable.deletedAt)];

  if (name) {
    conditions.push(
      or(ilike(ClientTable.firstName, `%${name}%`), ilike(ClientTable.lastName, `%${name}%`))!
    );
  }

  if (startDate) {
    conditions.push(gte(TransactionTable.txnDate, new Date(startDate)));
  }
  if (endDate) {
    conditions.push(lte(TransactionTable.txnDate, new Date(endDate)));
  }

  const transactions = await db.query.TransactionTable.findMany({
    where: and(...conditions),
    orderBy: desc(TransactionTable.txnDate),
    with: {
      payment: {
        with: {
          client: true,
          plan: true,
          rtoService: true,
        },
      },
    },
  });

  // Filter by branchId (transaction has no direct branchId)
  return transactions.filter((txn) => txn.payment?.branchId === branchId);
};

export const getTransactions = async (name?: string, startDate?: string, endDate?: string) => {
  const { id: branchId } = await getBranchConfig();
  return await _getTransactions(branchId, name, startDate, endDate);
};

export type Transaction = Awaited<ReturnType<typeof getTransactions>>[0];

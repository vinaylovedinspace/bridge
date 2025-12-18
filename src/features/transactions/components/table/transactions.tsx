import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getTransactions } from '@/server/db/transactions';
import { TransactionsTableWrapper } from './transactions-table-wrapper';

type TransactionsProps = {
  name?: string;
  startDate?: string;
  endDate?: string;
};

export async function Transactions({ name, startDate, endDate }: TransactionsProps) {
  const data = await getTransactions(name, startDate, endDate);

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <TransactionsTableWrapper data={data} />
    </Suspense>
  );
}

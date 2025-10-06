import { Suspense } from 'react';
import { ExpenseDataTable } from './data-table';
import { columns } from './columns';
import { getExpenses } from '@/server/db/expense';
import { Skeleton } from '@/components/ui/skeleton';

export async function Expenses() {
  const data = await getExpenses();

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ExpenseDataTable columns={columns} data={data} />
    </Suspense>
  );
}

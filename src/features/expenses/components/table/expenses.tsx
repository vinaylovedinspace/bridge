import { Suspense } from 'react';
import { ExpenseDataTable } from './data-table';
import { columns } from './columns';
import { getExpenses } from '@/server/db/expense';

export async function Expenses() {
  const data = await getExpenses();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExpenseDataTable columns={columns} data={data} />
    </Suspense>
  );
}

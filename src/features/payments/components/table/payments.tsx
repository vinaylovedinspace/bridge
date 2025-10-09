import { Suspense } from 'react';
import { columns } from './columns';
import { PaymentDataTable } from './data-table';
import { getPayments } from '@/server/db/payments';
import { PaymentFilters } from '../filters';
import { Skeleton } from '@/components/ui/skeleton';

export async function Payments({ name, paymentStatus }: { name?: string; paymentStatus?: string }) {
  const data = await getPayments(name, paymentStatus);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Payment table with all columns</h1>
      </div>
      <PaymentFilters />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <PaymentDataTable columns={columns} data={data} />
      </Suspense>
    </div>
  );
}

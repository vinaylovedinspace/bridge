import { Suspense } from 'react';
import { VehicleDataTable } from './data-table';
import { columns } from './columns';
import { getVehicles } from '@/server/db/vehicle';
import { Skeleton } from '@/components/ui/skeleton';

export async function Vehicles({ name }: { name?: string }) {
  const data = await getVehicles(name);

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <VehicleDataTable columns={columns} data={data} />
    </Suspense>
  );
}

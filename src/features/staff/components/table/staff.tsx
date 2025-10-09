import { Suspense } from 'react';
import { StaffDataTable } from './data-table';
import { columns } from './columns';
import { getStaff } from '@/server/db/staff';
import { Skeleton } from '@/components/ui/skeleton';

export async function Staff({ name, role }: { name?: string; role?: string }) {
  const data = await getStaff(name, role);

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <StaffDataTable columns={columns} data={data} />
    </Suspense>
  );
}

import { Suspense } from 'react';
import { EnrollmentDataTable } from './data-table';
import { columns } from './columns';
import { getEnrollments } from '@/server/db/enrollment';
import { Skeleton } from '@/components/ui/skeleton';

export async function Enrollments({
  search,
  paymentStatus,
}: {
  search?: string;
  paymentStatus?: string;
}) {
  const data = await getEnrollments(search, paymentStatus);

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EnrollmentDataTable columns={columns} data={data} />
    </Suspense>
  );
}

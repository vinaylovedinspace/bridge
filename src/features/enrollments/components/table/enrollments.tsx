import { Suspense } from 'react';
import { EnrollmentDataTable } from './data-table';
import { columns } from './columns';
import { getEnrollments } from '@/server/db/enrollment';

export async function Enrollments({
  search,
  paymentStatus,
}: {
  search?: string;
  paymentStatus?: string;
}) {
  const data = await getEnrollments(search, paymentStatus);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EnrollmentDataTable columns={columns} data={data} />
    </Suspense>
  );
}

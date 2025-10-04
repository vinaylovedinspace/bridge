import { Suspense } from 'react';
import { EnrollmentDataTable } from './data-table';
import { columns } from './columns';
import { getEnrollments } from '@/server/db/enrollment';

export async function Enrollments({ paymentStatus }: { paymentStatus?: string }) {
  const data = await getEnrollments(paymentStatus);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EnrollmentDataTable columns={columns} data={data} />
    </Suspense>
  );
}

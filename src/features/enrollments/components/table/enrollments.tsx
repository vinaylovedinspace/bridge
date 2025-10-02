import { Suspense } from 'react';
import { EnrollmentDataTable } from './data-table';
import { columns } from './columns';
import { getEnrollments } from '@/server/db/enrollment';

export async function Enrollments() {
  const data = await getEnrollments();
  console.log(data);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EnrollmentDataTable columns={columns} data={data} />
    </Suspense>
  );
}

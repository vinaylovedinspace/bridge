import { Suspense } from 'react';
import { Enrollments } from '@/features/enrollments/components/table/enrollments';

export default async function EnrollmentsPage() {
  return (
    <Suspense fallback={<div>Loading enrollments...</div>}>
      <Enrollments />
    </Suspense>
  );
}

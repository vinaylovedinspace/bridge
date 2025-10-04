import { Suspense } from 'react';
import { Enrollments } from '@/features/enrollments/components/table/enrollments';

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentStatus?: string }>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={<div>Loading enrollments...</div>}>
      <Enrollments paymentStatus={params.paymentStatus} />
    </Suspense>
  );
}

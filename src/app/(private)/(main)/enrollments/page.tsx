import { Suspense } from 'react';
import { Enrollments } from '@/features/enrollments/components/table/enrollments';

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; paymentStatus?: string }>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={<div>Loading enrollments...</div>}>
      <Enrollments search={params.search} paymentStatus={params.paymentStatus} />
    </Suspense>
  );
}

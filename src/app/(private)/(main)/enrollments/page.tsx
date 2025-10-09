import { Suspense } from 'react';
import { Enrollments } from '@/features/enrollments/components/table/enrollments';
import { Skeleton } from '@/components/ui/skeleton';

export default async function EnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; paymentStatus?: string }>;
}) {
  const params = await searchParams;
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Enrollments search={params.search} paymentStatus={params.paymentStatus} />
    </Suspense>
  );
}

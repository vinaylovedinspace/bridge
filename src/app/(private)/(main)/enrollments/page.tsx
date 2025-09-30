import { Suspense } from 'react';
import { TypographyH4 } from '@/components/ui/typography';
import { Enrollments } from '@/features/enrollments/components/table/enrollments';

export default async function EnrollmentsPage() {
  return (
    <div className="space-y-10" data-testid="enrollments-page">
      <TypographyH4 data-testid="enrollments-page-heading">Enrollments</TypographyH4>
      <Suspense fallback={<div>Loading enrollments...</div>}>
        <Enrollments />
      </Suspense>
    </div>
  );
}

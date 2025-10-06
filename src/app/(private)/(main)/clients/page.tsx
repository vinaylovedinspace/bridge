import { Suspense } from 'react';
import { TypographyH4 } from '@/components/ui/typography';
import { ClientFilters } from '@/features/clients/components/filters';
import { Clients } from '@/features/clients/components/table/clients';
import { Skeleton } from '@/components/ui/skeleton';

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    columns?: string;
    needsLearningTest?: string;
    needsDrivingTest?: string;
  }>;
}) {
  const params = await searchParams;
  const needsLearningTest = params.needsLearningTest === 'true';
  const needsDrivingTest = params.needsDrivingTest === 'true';

  return (
    <div className="space-y-10" data-testid="clients-page">
      <TypographyH4 data-testid="clients-page-heading">Clients</TypographyH4>
      <Suspense fallback={<Skeleton className="h-9 w-full" />}>
        <ClientFilters />
      </Suspense>
      <Clients
        search={params.search}
        needsLearningTest={needsLearningTest}
        needsDrivingTest={needsDrivingTest}
      />
    </div>
  );
}

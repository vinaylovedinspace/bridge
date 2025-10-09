import { Suspense } from 'react';
import { ClientDataTable } from './data-table';
import { columns } from './columns';
import { getClients } from '@/server/db/client';
import { Skeleton } from '@/components/ui/skeleton';

export async function Clients({
  search,
  needsLearningTest,
  needsDrivingTest,
}: {
  search?: string;
  needsLearningTest?: boolean;
  needsDrivingTest?: boolean;
}) {
  const data = await getClients(search, needsLearningTest, needsDrivingTest);

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ClientDataTable columns={columns} data={data} />
    </Suspense>
  );
}

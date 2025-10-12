import { Suspense } from 'react';
import { FormsContainer } from '@/features/forms/components/forms-container';
import { getClientsForForms } from '@/server/action/forms';
import { Skeleton } from '@/components/ui/skeleton';

export default async function FormsPage() {
  const clients = await getClientsForForms();

  return (
    <div className="space-y-10" data-testid="forms-page">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <FormsContainer clients={clients} />
      </Suspense>
    </div>
  );
}

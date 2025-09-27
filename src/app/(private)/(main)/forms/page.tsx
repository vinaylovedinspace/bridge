import { Suspense } from 'react';
import { FormsContainer } from '@/features/forms/components/forms-container';
import { getClientsForForms } from '@/server/actions/forms';

export default async function FormsPage() {
  const clients = await getClientsForForms();

  return (
    <div className="space-y-10" data-testid="forms-page">
      <Suspense fallback={<div>Loading forms...</div>}>
        <FormsContainer clients={clients} />
      </Suspense>
    </div>
  );
}

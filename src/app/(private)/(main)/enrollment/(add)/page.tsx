import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import MultistepForm from '@/features/enrollment/components/form/create-form';
import { getClientById } from '@/features/enrollment/server/db';

export default async function AdmissionPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; step?: string }>;
}) {
  const { clientId } = await searchParams;

  let existingClient = undefined;

  if (clientId) {
    const client = await getClientById(clientId);

    if (!client) {
      redirect('/enrollment');
    }

    existingClient = client;
  }

  return (
    <div data-testid="admission-page" className="h-full">
      <Suspense
        fallback={<div className="flex items-center justify-center h-full w-full">loading...</div>}
      >
        <MultistepForm existingClient={existingClient} />
      </Suspense>
    </div>
  );
}

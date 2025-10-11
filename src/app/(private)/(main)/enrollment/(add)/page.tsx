import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import MultistepForm from '@/features/enrollment/components/form/multistep-form';
import { getClientById } from '@/features/enrollment/server/action';

export default async function AdmissionPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; step?: string }>;
}) {
  const { clientId, step } = await searchParams;

  let existingClient = undefined;
  if (clientId) {
    const result = await getClientById(clientId);
    if (!result.error && result.data) {
      existingClient = result.data;
    }
  }

  // If there's no clientId and a step parameter exists, redirect to clear it
  if (!clientId && step) {
    redirect('/enrollment');
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

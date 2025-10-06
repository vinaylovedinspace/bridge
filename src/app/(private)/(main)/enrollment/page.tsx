import { Suspense } from 'react';
import MultistepForm from '@/features/enrollment/components/form/multistep-form';
import { getBranchConfig } from '@/server/db/branch';
import { getClientById } from '@/features/enrollment/server/action';
import { Skeleton } from '@/components/ui/skeleton';

export default async function AdmissionPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const branch = await getBranchConfig();

  let existingClient = undefined;
  if (clientId) {
    const result = await getClientById(clientId);
    if (!result.error && result.data) {
      existingClient = result.data;
    }
  }

  return (
    <div data-testid="admission-page">
      <Suspense fallback={<Skeleton className="h-[calc(100vh-316px)] w-full" />}>
        <MultistepForm branchConfig={branch} existingClient={existingClient} />
      </Suspense>
    </div>
  );
}

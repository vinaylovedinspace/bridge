import { Suspense } from 'react';
import MultistepForm from '@/features/enrollment/components/form/multistep-form';
import { getBranchConfig } from '@/server/db/branch';

export default async function AdmissionPage() {
  const branch = await getBranchConfig();

  return (
    <div data-testid="admission-page">
      <Suspense fallback={<div>Loading...</div>}>
        <MultistepForm branchConfig={branch} />
      </Suspense>
    </div>
  );
}

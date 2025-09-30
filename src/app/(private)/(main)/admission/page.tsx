import { Suspense } from 'react';
import { TypographyH4 } from '@/components/ui/typography';
import MultistepForm from '@/features/admission/components/form/multistep-form';
import { getBranchConfig } from '@/server/db/branch';

export default async function AdmissionPage() {
  const branch = await getBranchConfig();

  return (
    <div data-testid="admission-page">
      <header className="pb-6">
        <TypographyH4 data-testid="admission-page-heading">Admission Form</TypographyH4>
      </header>
      <Suspense fallback={<div>Loading...</div>}>
        <MultistepForm branchConfig={branch} />
      </Suspense>
    </div>
  );
}

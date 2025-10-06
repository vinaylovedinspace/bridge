import { Suspense } from 'react';
import { TypographyH4 } from '@/components/ui/typography';
import { RTOServiceMultistepForm } from '@/features/rto-services/components/form/multistep-form';
import { getBranchConfig } from '@/server/db/branch';

export default async function AddRTOServicePage() {
  const branchConfig = await getBranchConfig();

  return (
    <div className="h-full">
      <TypographyH4 className="">Add RTO Service</TypographyH4>
      <Suspense
        fallback={<div className="flex items-center justify-center h-full w-full">loading...</div>}
      >
        <RTOServiceMultistepForm branchConfig={branchConfig} />
      </Suspense>
    </div>
  );
}

import { Suspense } from 'react';
import { TypographyH4 } from '@/components/ui/typography';
import { RTOServiceMultistepForm } from '@/features/rto-services/components/form/multistep-form';

export default async function AddRTOServicePage() {
  return (
    <div>
      <TypographyH4 className="">Add RTO Service</TypographyH4>
      <Suspense
        fallback={
          <div className="h-[calc(100vh-200px)] flex items-center justify-center">
            Loading form...
          </div>
        }
      >
        <RTOServiceMultistepForm />
      </Suspense>
    </div>
  );
}

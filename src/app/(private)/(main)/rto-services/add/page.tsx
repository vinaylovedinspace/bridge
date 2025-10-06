import { Suspense } from 'react';
import { TypographyH4 } from '@/components/ui/typography';
import { RTOServiceMultistepForm } from '@/features/rto-services/components/form/multistep-form';
import { Skeleton } from '@/components/ui/skeleton';

export default async function AddRTOServicePage() {
  return (
    <div>
      <TypographyH4 className="">Add RTO Service</TypographyH4>
      <Suspense fallback={<Skeleton className="h-[calc(100vh-200px)] w-full" />}>
        <RTOServiceMultistepForm />
      </Suspense>
    </div>
  );
}

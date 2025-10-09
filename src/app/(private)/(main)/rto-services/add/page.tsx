import { Suspense } from 'react';
import { RTOServiceMultistepForm } from '@/features/rto-services/components/form/multistep-form';

export default async function AddRTOServicePage() {
  return (
    <div className="h-full">
      <Suspense
        fallback={<div className="flex items-center justify-center h-full w-full">loading...</div>}
      >
        <RTOServiceMultistepForm />
      </Suspense>
    </div>
  );
}

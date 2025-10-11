import { Suspense } from 'react';
import { RTOServiceMultistepForm } from '@/features/rto-services/components/form/multistep-form';
import { redirect } from 'next/navigation';

export default async function AddRTOServicePage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const { step } = await searchParams;

  if (step && step !== 'personal') {
    redirect('/rto-services/add');
  }

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

import { Suspense } from 'react';
import { FormsPage } from '@/features/forms/components/forms-page';

export default function Forms() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FormsPage />
    </Suspense>
  );
}

import { Suspense } from 'react';
import { FormsPageClient } from '@/features/forms/components/forms-page-client';
import { EligibleStudentsServer } from '@/features/forms/components/eligible-students-server';
import type { FilterType } from '@/server/db/forms';

interface FormsPageProps {
  searchParams?: Promise<{
    formType?: 'form-2' | 'form-4';
    filter?: FilterType;
  }>;
}

export default async function Forms({ searchParams }: FormsPageProps) {
  const params = await searchParams;
  const formType = params?.formType || 'form-2';
  const filter = params?.filter || 'new-only';

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FormsPageClient
        initialFormType={formType}
        eligibleStudentsSlot={<EligibleStudentsServer formType={formType} filter={filter} />}
      />
    </Suspense>
  );
}

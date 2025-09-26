import { Suspense } from 'react';
import {
  getEligibleStudentsForLearnersLicense,
  getEligibleStudentsForPermanentLicense,
  type FilterType,
} from '@/server/db/forms';
import { EligibleStudents } from '@/features/forms/components/eligible-students';

type FormsPageProps = {
  searchParams?: Promise<{
    type?: 'll' | 'dl';
    filter?: FilterType;
  }>;
};

export default async function Forms({ searchParams }: FormsPageProps) {
  const params = await searchParams;
  const type = params?.type || 'll';
  const filter = params?.filter || 'all-eligible';

  const list =
    type === 'll'
      ? await getEligibleStudentsForLearnersLicense(filter)
      : await getEligibleStudentsForPermanentLicense(filter);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EligibleStudents list={list} type={type} />
    </Suspense>
  );
}

import {
  getEligibleStudentsForPermanentLicense,
  getEligibleStudentsForLearnersLicense,
  getFormPrintStats,
} from '@/server/actions/forms';
import type { FilterType } from '@/server/db/forms';
import { EligibleStudentsClient } from './eligible-students-client';

interface EligibleStudentsServerProps {
  formType?: 'form-2' | 'form-4';
  filter?: FilterType;
}

export async function EligibleStudentsServer({
  formType = 'form-4',
  filter = 'new-only',
}: EligibleStudentsServerProps) {
  const getStudentsFunction =
    formType === 'form-2'
      ? getEligibleStudentsForLearnersLicense
      : getEligibleStudentsForPermanentLicense;

  const [students, stats] = await Promise.all([
    getStudentsFunction(filter),
    getFormPrintStats(formType),
  ]);

  return (
    <EligibleStudentsClient
      formType={formType}
      initialStudents={students}
      initialStats={stats}
      initialFilter={filter}
    />
  );
}

import { getAdmissionStatistics } from '../../server/actions';
import { AdmissionOverviewCard } from './admission-overview-card';

export default async function AdmissionOverview() {
  const admissionData = await getAdmissionStatistics(6); // Default to 6 months

  return <AdmissionOverviewCard initialData={admissionData} initialMonths={6} />;
}

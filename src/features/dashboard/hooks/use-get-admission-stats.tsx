import useSWR from 'swr';
import { AdmissionStatistics, getAdmissionStatistics } from '../server/actions';

export function useGetAdmissionStats(months: number = 6, initialData: AdmissionStatistics) {
  const response = useSWR(['admission', months], () => getAdmissionStatistics(months), {
    revalidateOnMount: true,
    fallbackData: initialData,
  });

  return response;
}

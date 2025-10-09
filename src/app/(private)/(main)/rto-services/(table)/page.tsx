import { RTOServices } from '@/features/rto-services/components/table/rto-services';

export default async function RTOServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; serviceType?: string; search?: string }>;
}) {
  const params = await searchParams;
  return (
    <RTOServices status={params.status} serviceType={params.serviceType} search={params.search} />
  );
}

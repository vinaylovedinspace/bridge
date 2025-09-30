import { TypographyH4 } from '@/components/ui/typography';
import { RTOServiceForm } from '@/features/rto-services/components/form';
import { getBranchConfig } from '@/server/db/branch';

export default async function AddRTOServicePage() {
  const branch = await getBranchConfig();

  return (
    <div>
      <TypographyH4 className="">Add RTO Service</TypographyH4>
      <RTOServiceForm defaultRtoOffice={branch?.defaultRtoOffice} />
    </div>
  );
}

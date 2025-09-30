import { TypographyH4 } from '@/components/ui/typography';
import { RTOServiceForm } from '@/features/rto-services/components/form';
import { getRTOService } from '@/features/rto-services/server/db';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getBranchConfig } from '@/server/db/branch';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [rtoService, branch] = await Promise.all([getRTOService(id), getBranchConfig()]);

  return (
    <div>
      <div className="flex gap-4 items-center">
        <Link href="/rto-services">
          <ArrowLeft className="size-5 text-gray-700" />
        </Link>
        <TypographyH4>Edit RTO Service</TypographyH4>
      </div>
      <RTOServiceForm
        rtoService={rtoService || undefined}
        defaultRtoOffice={branch?.defaultRtoOffice}
      />
    </div>
  );
}

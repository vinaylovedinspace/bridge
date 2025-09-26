import { getClient } from '@/server/db/client';
import { getCurrentOrganizationBranch } from '@/server/db/branch';
import { notFound } from 'next/navigation';
import { ClientAdmissionForm } from '@/features/clients/components/client-admission-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { TypographyH4 } from '@/components/ui/typography';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [client, branch] = await Promise.all([getClient(id), getCurrentOrganizationBranch()]);

  if (!client || !branch) {
    notFound();
  }
  console.log('branch', branch);
  const branchConfig = {
    workingDays: branch.workingDays || [],
    operatingHours: branch.operatingHours || { start: '09:00', end: '17:00' },
    licenseServiceCharge: branch.licenseServiceCharge || 0,
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex gap-4 items-center pb-4">
        <Link href="/vehicles">
          <ArrowLeft className="size-5 text-gray-700" />
        </Link>
        <TypographyH4>
          {client.firstName} {client.middleName} {client.lastName}
        </TypographyH4>
      </div>

      <ClientAdmissionForm client={client} branchConfig={branchConfig} />
    </div>
  );
}

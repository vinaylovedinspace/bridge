import { getClient } from '@/server/db/client';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { TypographyH4 } from '@/components/ui/typography';
import { getBranchConfig } from '@/server/db/branch';
import { EditAdmissionForm } from '@/features/admission/components/form/edit';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [client, branch] = await Promise.all([getClient(id), getBranchConfig()]);

  if (!client) {
    notFound();
  }

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

      <EditAdmissionForm client={client} branchConfig={branch} />
    </div>
  );
}

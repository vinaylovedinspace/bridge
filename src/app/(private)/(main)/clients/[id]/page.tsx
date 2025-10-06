import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { TypographyH4 } from '@/components/ui/typography';
import { getClient } from '@/server/db/client';
import { ClientDetailForm } from '@/features/clients/components/detail/client-detail-form';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  return (
    <div className="container mx-auto">
      <div className="flex gap-4 items-center pb-4">
        <Link href="/clients">
          <ArrowLeft className="size-5 text-gray-700" />
        </Link>
        <TypographyH4>
          {client.firstName} {client.middleName} {client.lastName}
        </TypographyH4>
      </div>

      <ClientDetailForm client={client} />
    </div>
  );
}

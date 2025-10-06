import { Suspense } from 'react';
import { TypographyH4 } from '@/components/ui/typography';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { RTOServiceMultistepForm } from '@/features/rto-services/components/form/multistep-form';
import { getRTOService } from '@/features/rto-services/server/db';
import { notFound } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const rtoService = await getRTOService(id);

  if (!rtoService) {
    notFound();
  }

  return (
    <div className="h-full">
      <div className="flex gap-4 items-center">
        <Link href="/rto-services">
          <ArrowLeft className="size-5 text-gray-700" />
        </Link>
        <TypographyH4>Edit RTO Service</TypographyH4>
      </div>
      <Suspense
        fallback={<div className="flex items-center justify-center h-full w-full">loading...</div>}
      >
        <RTOServiceMultistepForm rtoService={rtoService} />
      </Suspense>
    </div>
  );
}

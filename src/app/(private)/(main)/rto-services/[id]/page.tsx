import { TypographyH4 } from '@/components/ui/typography';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { RTOServiceMultistepForm } from '@/features/rto-services/components/form/multistep-form';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.log(id);
  return (
    <div>
      <div className="flex gap-4 items-center">
        <Link href="/rto-services">
          <ArrowLeft className="size-5 text-gray-700" />
        </Link>
        <TypographyH4>Edit RTO Service</TypographyH4>
      </div>
      <RTOServiceMultistepForm />
    </div>
  );
}

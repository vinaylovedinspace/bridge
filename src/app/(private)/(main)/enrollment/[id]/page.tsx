import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { TypographyH4 } from '@/components/ui/typography';
import { EditAdmissionForm } from '@/features/enrollment/components/form/edit';
import { getEnrollmentByPlanId } from '@/server/db/plan';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const enrollment = await getEnrollmentByPlanId(id);

  if (!enrollment) {
    notFound();
  }

  return (
    <div className="container mx-auto">
      <div className="flex gap-4 items-center pb-4">
        <Link href="/enrollments">
          <ArrowLeft className="size-5 text-gray-700" />
        </Link>
        <TypographyH4>
          {enrollment.client.firstName} {enrollment.client.middleName} {enrollment.client.lastName}
        </TypographyH4>
      </div>

      <EditAdmissionForm enrollment={enrollment} />
    </div>
  );
}

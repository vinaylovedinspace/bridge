import { notFound } from 'next/navigation';
import { TypographyH4 } from '@/components/ui/typography';
import { EditAdmissionForm } from '@/features/enrollment/components/form/edit-form';
import { getEnrollmentByPlanId } from '@/server/db/plan';
import { BackButton } from '@/components/back-button';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const enrollment = await getEnrollmentByPlanId(id);

  if (!enrollment) {
    notFound();
  }

  return (
    <div className="space-y-10">
      <div className="flex gap-4 items-center">
        <BackButton />
        <TypographyH4>
          {enrollment.client.firstName} {enrollment.client.middleName} {enrollment.client.lastName}
        </TypographyH4>
      </div>
      <EditAdmissionForm enrollment={enrollment} />
    </div>
  );
}

import { notFound } from 'next/navigation';
import { TypographyH4 } from '@/components/ui/typography';
import { StaffForm } from '@/features/staff/components/form';
import { getStaffMember } from '@/server/action/staff';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, orgRole } = await auth();

  console.log('Staff detail page - ID:', id, 'User:', userId, 'Role:', orgRole);

  const staff = await getStaffMember(id);

  if (!staff) {
    console.log('Staff not found, showing 404');
    notFound();
  }

  return (
    <div className="space-y-10">
      <div className="flex gap-4 items-center pb-14">
        <Link href="/staff">
          <ArrowLeft className="size-5 text-gray-700" />
        </Link>
        <TypographyH4>Edit Staff Member</TypographyH4>
      </div>
      <StaffForm staff={staff} />
    </div>
  );
}

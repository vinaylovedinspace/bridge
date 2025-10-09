import { Suspense } from 'react';
import { TypographyH4 } from '@/components/ui/typography';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ClientSearch } from '@/features/clients/components/client-search';

export default function EnrollmentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-10" data-testid="enrollments-page">
      <div className="flex justify-between items-center">
        <TypographyH4 data-testid="enrollments-page-heading">Enrollments</TypographyH4>

        <Link href="/enrollment" id="add-vehicle">
          <Button variant="outline">
            <Plus className="h-3 w-3" /> Add
          </Button>
        </Link>
      </div>
      <Suspense fallback={<div className="w-96 h-10 bg-muted animate-pulse rounded-md" />}>
        <ClientSearch />
      </Suspense>
      {children}
    </div>
  );
}

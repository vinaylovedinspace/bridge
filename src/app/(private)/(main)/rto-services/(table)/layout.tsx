import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { TypographyH4 } from '@/components/ui/typography';
import { RTOServiceStatusFilter } from '@/features/rto-services/components/status-filter';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientSearch } from '@/features/clients/components/client-search';

export default function RTOServicesTableLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-10">
      <TypographyH4>RTO Services</TypographyH4>
      <div className="flex justify-between items-center">
        <div className="grid grid-cols-12 gap-4 items-center w-full">
          <Suspense fallback={<Skeleton className="h-9 w-full" />}>
            <div className="col-span-4">
              <ClientSearch className="w-full" />
            </div>
          </Suspense>
          <Suspense fallback={<Skeleton className="h-9 w-full" />}>
            <div className="col-span-3">
              <RTOServiceStatusFilter />
            </div>
          </Suspense>
        </div>
        <Link href="/rto-services/add">
          <Button variant="outline">
            <Plus className="h-4 w-4" />
            Add RTO Service
          </Button>
        </Link>
      </div>
      {children}
    </div>
  );
}

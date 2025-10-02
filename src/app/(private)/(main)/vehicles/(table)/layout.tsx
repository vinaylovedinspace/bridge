import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { TypographyH4 } from '@/components/ui/typography';
import { VehicleSearchBar } from '@/features/vehicles/components/search-bar';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function VehiclesTableLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-10">
      <TypographyH4>Vehicles</TypographyH4>
      <div className="flex justify-between items-center">
        <Suspense fallback={<div>Loading search...</div>}>
          <VehicleSearchBar />
        </Suspense>
        <Link href="/vehicles/add" id="add-vehicle">
          <Button variant="outline">
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </Link>
      </div>
      {children}
    </div>
  );
}

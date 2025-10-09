import { Button } from '@/components/ui/button';
import { TypographyH4 } from '@/components/ui/typography';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function ExpensesTableLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-10">
      <TypographyH4>Expenses</TypographyH4>
      <div className="flex justify-end items-center">
        <Link href="/expenses/add" id="add-expense">
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

import { TypographyH4 } from '@/components/ui/typography';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ExpenseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="space-y-10">
        <div className="flex gap-4 items-center">
          <Link href="/expenses">
            <ArrowLeft className="size-5 text-gray-700" />
          </Link>
          <TypographyH4>Edit Expense</TypographyH4>
        </div>
        {children}
      </div>
    </div>
  );
}

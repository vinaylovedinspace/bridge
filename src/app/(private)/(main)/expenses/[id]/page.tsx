import { TypographyH4 } from '@/components/ui/typography';
import { ExpenseForm } from '@/features/expenses/components/form';
import { getExpense } from '@/server/db/expense';
import { getStaff } from '@/server/db/staff';
import { notFound } from 'next/navigation';

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [expense, staff] = await Promise.all([getExpense(id), getStaff()]);

  if (!expense) {
    notFound();
  }

  return <ExpenseForm expense={expense} staff={staff} />;
}

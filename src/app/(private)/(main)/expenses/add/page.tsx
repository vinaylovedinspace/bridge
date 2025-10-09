import { TypographyH4 } from '@/components/ui/typography';
import { ExpenseForm } from '@/features/expenses/components/form';
import { getStaff } from '@/server/db/staff';

export default async function AddExpensePage() {
  const staff = await getStaff();

  return (
    <div>
      <TypographyH4 className="pb-14">Add Expense</TypographyH4>
      <ExpenseForm staff={staff} />
    </div>
  );
}

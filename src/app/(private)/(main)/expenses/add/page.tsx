import { ExpenseForm } from '@/features/expenses/components/form';
import { getStaff } from '@/server/db/staff';

export default async function AddExpensePage() {
  const staff = await getStaff();

  return <ExpenseForm staff={staff} />;
}

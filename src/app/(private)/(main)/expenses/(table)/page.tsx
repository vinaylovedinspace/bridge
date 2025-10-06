import { Expenses } from '@/features/expenses/components/table/expenses';

export default async function ExpensesPage() {
  return (
    <div data-testid="expenses-page">
      <Expenses />
    </div>
  );
}

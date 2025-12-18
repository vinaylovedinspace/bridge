import { TypographyH4 } from '@/components/ui/typography';
import { Transactions } from '@/features/transactions/components/table/transactions';

type TransactionsPageProps = {
  searchParams: Promise<{
    name?: string;
    startDate?: string;
    endDate?: string;
  }>;
};

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = await searchParams;
  return (
    <div>
      <TypographyH4 data-testid="transactions-page-heading" className="pb-5">
        Transactions
      </TypographyH4>
      <Transactions name={params.name} startDate={params.startDate} endDate={params.endDate} />
    </div>
  );
}

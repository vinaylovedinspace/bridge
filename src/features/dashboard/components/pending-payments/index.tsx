import { getOverduePaymentsCount } from '../../server/actions';
import { PendingPaymentsCard } from './pending-payments-card';

export async function PendingPayments() {
  const count = await getOverduePaymentsCount();

  return <PendingPaymentsCard count={count} />;
}

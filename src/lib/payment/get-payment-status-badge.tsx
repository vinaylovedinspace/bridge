import { Badge } from '@/components/ui/badge';

export const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case 'PENDING':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
    case 'PARTIALLY_PAID':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Partially Paid</Badge>;
    case 'FULLY_PAID':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
    case 'OVERDUE':
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

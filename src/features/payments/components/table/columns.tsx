'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

import type { Payment } from '@/server/db/payments';

const getPaymentStatusBadge = (status: string) => {
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

const formatCurrency = (amount: number) => {
  return `₹ ${amount.toLocaleString()}`;
};

const formatDate = (date?: Date | null) => {
  if (!date) return '-';
  return format(new Date(date), 'dd/MM/yyyy');
};

export const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: 'clientCode',
    header: 'Client Code',
    cell: ({ row }) => {
      return <Badge variant="outline">CS-{row.original.clientCode}</Badge>;
    },
  },
  {
    accessorKey: 'clientName',
    header: 'Name',
  },
  {
    accessorKey: 'amountDue',
    header: 'Amount Due',
    cell: ({ row }) => {
      const amount = row.original.amountDue;
      return (
        <span className={amount > 0 ? 'text-blue-600' : 'text-green-600'}>
          {formatCurrency(amount)}
        </span>
      );
    },
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total Amount',
    cell: ({ row }) => {
      return formatCurrency(row.original.totalAmount);
    },
  },
  {
    accessorKey: 'nextInstallmentDate',
    header: 'Next Installment Date',
    cell: ({ row }) => {
      const date = row.original.nextInstallmentDate;
      const isOverdue =
        date && new Date(date) < new Date() && row.original.paymentStatus === 'OVERDUE';
      return <span className={isOverdue ? 'text-red-600' : ''}>{formatDate(date)}</span>;
    },
  },
  {
    accessorKey: 'paymentStatus',
    header: 'Payment Status',
    cell: ({ row }) => {
      return getPaymentStatusBadge(row.original.paymentStatus);
    },
  },
  {
    accessorKey: 'lastPaymentDate',
    header: 'Last Payment Date',
    cell: ({ row }) => {
      return formatDate(row.original.lastPaymentDate);
    },
  },
];

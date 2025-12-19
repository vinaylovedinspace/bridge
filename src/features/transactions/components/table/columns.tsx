'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { Transaction } from '@/server/db/transactions';

const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
const formatDate = (date?: Date | null) =>
  date ? format(new Date(date), 'dd MMM yyyy, hh:mm a') : '-';

const statusBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SUCCESS: 'default',
  PENDING: 'secondary',
  FAILED: 'destructive',
  REFUNDED: 'outline',
  CANCELLED: 'outline',
};

export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: 'txnDate',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.txnDate),
  },
  {
    accessorKey: 'client',
    header: 'Client',
    cell: ({ row }) => {
      const client = row.original.payment?.client;
      if (!client) return '-';
      return (
        <div>
          <div className="font-medium">
            {client.firstName} {client.lastName}
          </div>
          <div className="text-sm text-muted-foreground">CS-{client.clientCode}</div>
        </div>
      );
    },
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const payment = row.original.payment;
      if (!payment) return '-';
      const type = payment.rtoService ? 'RTO Service' : payment.plan ? 'Enrollment' : '-';
      return <Badge variant="secondary">{type}</Badge>;
    },
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => formatCurrency(row.original.amount),
  },
  {
    accessorKey: 'paymentMode',
    header: 'Mode',
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.paymentMode.replace('_', ' ')}</Badge>
    ),
  },
  {
    accessorKey: 'transactionStatus',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={statusBadgeVariant[row.original.transactionStatus] || 'outline'}>
        {row.original.transactionStatus}
      </Badge>
    ),
  },
  {
    accessorKey: 'paymentGateway',
    header: 'Gateway',
    cell: ({ row }) => row.original.paymentGateway || '-',
  },
  {
    accessorKey: 'installmentNumber',
    header: 'Installment',
    cell: ({ row }) => {
      const num = row.original.installmentNumber;
      return num ? `#${num}` : '-';
    },
  },
];

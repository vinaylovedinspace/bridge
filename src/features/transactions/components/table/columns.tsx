'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
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
    accessorKey: 'transactionReference',
    header: 'Reference',
    cell: ({ row }) => row.original.transactionReference || '-',
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
  {
    accessorKey: 'notes',
    header: 'Notes',
    cell: ({ row }) => row.original.notes || '-',
  },
];

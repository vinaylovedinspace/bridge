'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

import type { Payment } from '@/server/db/payments';
import { getPaymentStatusBadge } from '@/lib/payment/get-payment-status-badge';

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
      return <Badge variant="outline">CS-{row.original.client?.clientCode}</Badge>;
    },
  },
  {
    accessorKey: 'clientName',
    header: 'Name',
    cell: ({ row }) => {
      return row.original.client?.firstName + ' ' + row.original.client?.lastName;
    },
  },
  {
    accessorKey: 'client.phoneNumber',
    header: 'Phone Number',
  },
  {
    accessorKey: 'type',
    header: 'Payment for',
    cell: ({ row }) => {
      const plan = row.original.plan;
      const rtoService = row.original.rtoService;

      if (plan) {
        return <Badge>{plan.serviceType.replace('_', ' ')}</Badge>;
      }

      if (rtoService) {
        return <Badge>RTO Service</Badge>;
      }

      return '-';
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
    accessorKey: 'paymentStatus',
    header: 'Payment Status',
    cell: ({ row }) => {
      return getPaymentStatusBadge(row.original.paymentStatus);
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => {
      return formatDate(row.original.createdAt);
    },
  },
];

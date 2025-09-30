'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export type Enrollment = {
  planId: string;
  planCode: string;
  clientId: string;
  clientCode: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phoneNumber: string;
  planStatus:
    | 'NOT_STARTED'
    | 'WAITING_FOR_LL_TEST'
    | 'IN_PROGRESS'
    | 'WAITING_FOR_DL_TEST'
    | 'COMPLETED';
  paymentStatus?: 'PENDING' | 'PARTIALLY_PAID' | 'FULLY_PAID' | null;
  createdAt: Date;
};

const getPaymentStatusBadge = (status?: string | null) => {
  if (!status) {
    return <Badge variant="secondary">No Payment</Badge>;
  }

  switch (status) {
    case 'PENDING':
      return <Badge variant="destructive">Pending</Badge>;
    case 'PARTIALLY_PAID':
      return <Badge variant="secondary">Partially Paid</Badge>;
    case 'FULLY_PAID':
      return (
        <Badge variant="default" className="bg-green-500 font-bold">
          Fully Paid
        </Badge>
      );
    default:
      return <Badge variant="secondary">No Payment</Badge>;
  }
};

const getPlanStatusBadge = (status: string) => {
  switch (status) {
    case 'NOT_STARTED':
      return <Badge variant="secondary">Not Started</Badge>;
    case 'WAITING_FOR_LL_TEST':
      return <Badge variant="outline">Pending LL Test</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="default">In Progress</Badge>;
    case 'WAITING_FOR_DL_TEST':
      return <Badge variant="outline">Pending DL Test</Badge>;
    case 'COMPLETED':
      return (
        <Badge variant="default" className="bg-green-500">
          Completed
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export const columns: ColumnDef<Enrollment>[] = [
  {
    accessorKey: 'planCode',
    header: 'Plan Code',
    cell: ({ row }) => {
      return <Badge variant="outline">EL-{row.original.planCode}</Badge>;
    },
  },
  {
    accessorKey: 'clientCode',
    header: 'Client Code',
    cell: ({ row }) => {
      return <Badge variant="outline">CS-{row.original.clientCode}</Badge>;
    },
  },
  {
    accessorKey: 'name',
    header: 'Client Name',
    cell: ({ row }) => {
      const { firstName, middleName, lastName } = row.original;
      return `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`;
    },
  },
  {
    accessorKey: 'phoneNumber',
    header: 'Phone Number',
  },
  {
    accessorKey: 'paymentStatus',
    header: 'Payment Status',
    cell: ({ row }) => {
      return getPaymentStatusBadge(row.original.paymentStatus);
    },
  },
  {
    accessorKey: 'planStatus',
    header: 'Plan Status',
    cell: ({ row }) => {
      return getPlanStatusBadge(row.original.planStatus);
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Enrollment Date',
    cell: ({ row }) => {
      return format(new Date(row.original.createdAt), 'MMM dd, yyyy');
    },
  },
];

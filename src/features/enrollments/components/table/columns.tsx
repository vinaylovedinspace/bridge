'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Enrollments } from '@/server/db/enrollment';

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
        <Badge variant="default" className="bg-green-600 font-bold">
          PAID
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

export const columns: ColumnDef<Enrollments[number]>[] = [
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
      return <Badge variant="outline">CS-{row.original.client.clientCode}</Badge>;
    },
  },
  {
    accessorKey: 'name',
    header: 'Client Name',
    cell: ({ row }) => {
      const { firstName, middleName, lastName } = row.original.client;
      return `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`;
    },
  },
  {
    accessorKey: 'phoneNumber',
    header: 'Phone Number',
    cell: ({ row }) => {
      const { phoneNumber } = row.original.client;
      return phoneNumber;
    },
  },
  {
    accessorKey: 'paymentStatus',
    header: 'Payment Status',
    cell: ({ row }) => {
      return getPaymentStatusBadge(row.original.payment?.paymentStatus);
    },
  },
  {
    accessorKey: 'planStatus',
    header: 'Plan Status',
    cell: ({ row }) => {
      return getPlanStatusBadge(row.original.status);
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

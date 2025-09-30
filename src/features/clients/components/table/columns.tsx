'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export type Client = {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phoneNumber: string;
  email?: string | null;
  address: string;
  city: string;
  state: string;
  clientCode: string;
  createdAt: Date;
  paymentStatus?: 'PENDING' | 'PARTIALLY_PAID' | 'FULLY_PAID' | null;
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  remainingSessions: number;
  unassignedSessions: number;
  isComplete: boolean;
  completionStatus: 'COMPLETE' | 'INCOMPLETE';
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

const getCompletionStatusBadge = (isComplete: boolean) => {
  return isComplete ? (
    <Badge variant="default">Complete</Badge>
  ) : (
    <Badge variant="destructive">Incomplete</Badge>
  );
};

export const columns: ColumnDef<Client>[] = [
  {
    accessorKey: 'clientCode',
    header: 'Client Code',
    cell: ({ row }) => {
      return <Badge variant="outline">CS-{row.original.clientCode}</Badge>;
    },
  },
  {
    accessorKey: 'name',
    header: 'Name',
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
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => {
      return row.original.email || '-';
    },
  },
  {
    accessorKey: 'location',
    header: 'Location',
    cell: ({ row }) => {
      const { city, state } = row.original;
      return `${city}, ${state}`;
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
    accessorKey: 'completedSessions',
    header: 'Completed',
    cell: ({ row }) => {
      const completed = row.original.completedSessions;
      const total = row.original.totalSessions;
      return (
        <Badge variant="outline">
          {completed}/{total}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'cancelledSessions',
    header: 'Cancelled',
    cell: ({ row }) => {
      const cancelled = row.original.cancelledSessions;
      return <Badge variant={cancelled > 0 ? 'destructive' : 'outline'}>{cancelled}</Badge>;
    },
  },
  {
    accessorKey: 'remainingSessions',
    header: 'Remaining',
    cell: ({ row }) => {
      const remaining = row.original.remainingSessions;
      return <Badge variant={remaining > 0 ? 'default' : 'secondary'}>{remaining}</Badge>;
    },
  },
  {
    accessorKey: 'completionStatus',
    header: 'Status',
    cell: ({ row }) => {
      return getCompletionStatusBadge(row.original.isComplete);
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Joining Date',
    cell: ({ row }) => {
      return format(new Date(row.original.createdAt), 'MMM dd, yyyy');
    },
  },
];

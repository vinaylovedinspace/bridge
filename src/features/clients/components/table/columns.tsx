'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export type Client = {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phoneNumber: string;
  clientCode: string;
  hasPlan: boolean;
  plan?: Array<{
    id: string;
    serviceType: 'FULL_SERVICE' | 'DRIVING_ONLY';
    numberOfSessions: number;
    joiningDate: string;
  }>;
  sessions?: Array<{
    id: string;
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';
  }>;
};

export const columns: ColumnDef<Client>[] = [
  {
    accessorKey: 'clientCode',
    header: 'Client Code',
    cell: ({ row }) => {
      const { id, clientCode } = row.original;
      return (
        <Link href={`/clients/${id}`}>
          <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
            CS-{clientCode}
          </Badge>
        </Link>
      );
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
    accessorKey: 'serviceType',
    header: 'Service Type',
    cell: ({ row }) => {
      const { plan } = row.original;

      if (!plan || plan.length === 0) {
        return <Badge variant="secondary">No Plan</Badge>;
      }

      const clientPlan = plan[0];
      return (
        <Badge variant="default" className="bg-blue-500">
          {clientPlan.serviceType === 'FULL_SERVICE' ? 'Full Service' : 'Driving Only'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'sessions',
    header: 'Sessions',
    cell: ({ row }) => {
      const { plan, sessions } = row.original;

      if (!plan || plan.length === 0) {
        return <span className="text-xs text-gray-500">-</span>;
      }

      const clientPlan = plan[0];
      const totalSessions = clientPlan.numberOfSessions;
      const completedSessions = sessions?.filter((s) => s.status === 'COMPLETED').length || 0;
      const pendingSessions = totalSessions - completedSessions;

      return (
        <div className="text-sm">
          {completedSessions}/{totalSessions}{' '}
          <span className="text-xs text-gray-500">({pendingSessions} pending)</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'joiningDate',
    header: 'Joining Date',
    cell: ({ row }) => {
      const { plan } = row.original;

      if (!plan || plan.length === 0) {
        return <span className="text-xs text-gray-500">-</span>;
      }

      const clientPlan = plan[0];
      return <div className="text-sm">{new Date(clientPlan.joiningDate).toLocaleDateString()}</div>;
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const { plan, id } = row.original;

      if (!plan || plan.length === 0) {
        return (
          <Link href={`/enrollment?clientId=${id}`} onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="outline">
              Complete Enrollment
            </Button>
          </Link>
        );
      }

      return null;
    },
  },
];

'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';

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
    accessorKey: 'planDetails',
    header: 'Plan Details',
    cell: ({ row }) => {
      const { plan, sessions } = row.original;

      if (!plan || plan.length === 0) {
        return <Badge variant="secondary">No Plan</Badge>;
      }

      const clientPlan = plan[0];
      const totalSessions = clientPlan.numberOfSessions;
      const completedSessions = sessions?.filter((s) => s.status === 'COMPLETED').length || 0;
      const pendingSessions = totalSessions - completedSessions;

      return (
        <div className="flex flex-col gap-1">
          <div className="flex gap-2 items-center">
            <Badge variant="default" className="bg-blue-500">
              {clientPlan.serviceType === 'FULL_SERVICE' ? 'Full Service' : 'Driving Only'}
            </Badge>
          </div>
          <div className="text-xs text-gray-600">
            Sessions: {completedSessions}/{totalSessions} ({pendingSessions} pending)
          </div>
          <div className="text-xs text-gray-500">
            Joined: {new Date(clientPlan.joiningDate).toLocaleDateString()}
          </div>
        </div>
      );
    },
  },
];

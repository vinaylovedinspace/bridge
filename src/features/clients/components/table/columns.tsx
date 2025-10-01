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
    accessorKey: 'hasPlan',
    header: 'Has Plan',
    cell: ({ row }) => {
      const { hasPlan } = row.original;
      return hasPlan ? (
        <Badge variant="default" className="bg-green-500">
          Plan
        </Badge>
      ) : (
        <Badge variant="secondary">No Plan</Badge>
      );
    },
  },
];

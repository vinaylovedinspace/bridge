'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PopConfirm } from '@/components/ui/pop-confirm';
import { MoreHorizontal, Trash2, Edit } from 'lucide-react';
import { deleteRTOService } from '../../server/action';
import { toast } from 'sonner';
import {
  RTO_SERVICE_TYPE_LABELS,
  RTO_SERVICE_STATUS_LABELS,
  type RTOServiceStatus,
} from '../../types';
import Link from 'next/link';
import { getRTOServices } from '../../server/db';

type RTOServiceWithClient = Awaited<ReturnType<typeof getRTOServices>>[number];

export const columns: ColumnDef<RTOServiceWithClient>[] = [
  {
    accessorKey: 'client.clientCode',
    header: 'Client Code',
    cell: ({ row }) => {
      const client = row.original.client;
      return client?.clientCode ? <Badge variant="outline">RS-{client.clientCode}</Badge> : '-';
    },
  },
  {
    accessorKey: 'client.firstName',
    header: 'Client Name',
    cell: ({ row }) => {
      const client = row.original.client;
      if (!client) return '-';
      return `${client.firstName} ${client.middleName ? client.middleName + ' ' : ''}${client.lastName}`;
    },
  },
  {
    accessorKey: 'serviceType',
    header: 'Service Type',
    cell: ({ row }) => {
      const serviceType = row.original.serviceType;
      return RTO_SERVICE_TYPE_LABELS[serviceType];
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      const statusColors: Record<RTOServiceStatus, string> = {
        PENDING: 'bg-gray-100 text-gray-800',
        DOCUMENT_COLLECTION: 'bg-blue-100 text-blue-800',
        APPLICATION_SUBMITTED: 'bg-yellow-100 text-yellow-800',
        UNDER_REVIEW: 'bg-orange-100 text-orange-800',
        APPROVED: 'bg-green-100 text-green-800',
        REJECTED: 'bg-red-100 text-red-800',
        COMPLETED: 'bg-emerald-100 text-emerald-800',
        CANCELLED: 'bg-gray-100 text-gray-800',
      };

      return <Badge className={statusColors[status]}>{RTO_SERVICE_STATUS_LABELS[status]}</Badge>;
    },
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total Amount',
    cell: ({ row }) => {
      const amount = row.original.payment?.finalAmount;
      return amount ? `₹${amount.toLocaleString()}` : '-';
    },
  },
  {
    accessorKey: 'applicationDate',
    header: 'Application Date',
    cell: ({ row }) => {
      const date = row.original.applicationDate;
      return date ? new Date(date).toLocaleDateString() : '-';
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const service = row.original;

      const handleDelete = async () => {
        try {
          const result = await deleteRTOService(service.id);
          if (result.error) {
            toast.error(result.message);
          } else {
            toast.success(result.message);
            // Refresh the page to update the table
            window.location.reload();
          }
        } catch {
          toast.error('Failed to delete RTO service');
        }
      };

      return (
        <div onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-0">
              <Link href={`/rto-services/${service.id}`}>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-3 py-2 text-sm w-full justify-start h-auto rounded-none"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <PopConfirm
                title="Delete RTO Service"
                description="Are you sure you want to delete this RTO service? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={handleDelete}
                variant="destructive"
              >
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-600 w-full justify-start h-auto rounded-none"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </PopConfirm>
            </PopoverContent>
          </Popover>
        </div>
      );
    },
  },
];

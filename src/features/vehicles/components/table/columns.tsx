'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PopConfirm } from '@/components/ui/pop-confirm';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { deleteVehicle } from '../../server/action';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Vehicle = {
  id: string;
  name: string;
  number: string;
  pucExpiry: string | null;
  insuranceExpiry: string | null;
  registrationExpiry: string | null;
  rent: number;
};

export const columns: ColumnDef<Vehicle>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'number',
    header: 'Number',
    cell: ({ row }) => {
      const vehicle = row.original;

      if (vehicle.number) {
        return <Badge variant="outline">{vehicle.number}</Badge>;
      }
      return <span className="text-muted-foreground">-</span>;
    },
  },
  {
    accessorKey: 'rent',
    header: 'Rent',
  },
  {
    accessorKey: 'pucExpiry',
    header: 'PUC Expiry',
  },
  {
    accessorKey: 'insuranceExpiry',
    header: 'Insurance Expiry',
  },
  {
    accessorKey: 'registrationExpiry',
    header: 'Registration Expiry',
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const vehicle = row.original;

      const handleDelete = async () => {
        try {
          const result = await deleteVehicle(vehicle.id);
          if (result.error) {
            toast.error(result.message);
          } else {
            toast.success(result.message);
            // Refresh the page to update the table
            window.location.reload();
          }
        } catch {
          toast.error('Failed to delete vehicle');
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
              <PopConfirm
                title="Delete Vehicle"
                description="Are you sure you want to delete this vehicle? This action cannot be undone."
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

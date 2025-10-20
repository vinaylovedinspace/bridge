'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PopConfirm } from '@/components/ui/pop-confirm';
import { format } from 'date-fns';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { deleteStaff } from '../../server/action';
import { toast } from 'sonner';

export type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  photo?: string | null;
  staffRole: 'instructor' | 'manager' | 'accountant';
  clerkRole: 'admin' | 'member';
  assignedVehicleId?: string | null;
  assignedVehicle?: {
    name: string;
    number: string;
  } | null;
  createdAt: Date;
};

const getStaffRoleBadge = (role: string) => {
  switch (role) {
    case 'instructor':
      return <Badge variant="default">Instructor</Badge>;
    case 'manager':
      return <Badge variant="secondary">Manager</Badge>;
    case 'accountant':
      return <Badge variant="outline">Accountant</Badge>;
    default:
      return <Badge variant="secondary">{role}</Badge>;
  }
};

const getClerkRoleBadge = (role: string) => {
  switch (role) {
    case 'admin':
      return <Badge variant="destructive">Admin</Badge>;
    case 'member':
      return <Badge variant="default">Member</Badge>;
    default:
      return <Badge variant="secondary">{role}</Badge>;
  }
};

export const columns: ColumnDef<Staff>[] = [
  {
    accessorKey: 'photo',
    header: 'Photo',
    cell: ({ row }) => {
      const { firstName, lastName, photo } = row.original;
      const initials = `${firstName[0]}${lastName[0]}`;
      return (
        <Avatar className="h-8 w-8">
          <AvatarImage src={photo || ''} alt={`${firstName} ${lastName}`} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      );
    },
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const { firstName, lastName } = row.original;
      return `${firstName} ${lastName}`;
    },
  },
  {
    accessorKey: 'staffRole',
    header: 'Staff Role',
    cell: ({ row }) => {
      return getStaffRoleBadge(row.original.staffRole);
    },
  },
  {
    accessorKey: 'clerkRole',
    header: 'Access Level',
    cell: ({ row }) => {
      return getClerkRoleBadge(row.original.clerkRole);
    },
  },
  {
    accessorKey: 'assignedVehicle',
    header: 'Assigned Vehicle',
    cell: ({ row }) => {
      const vehicle = row.original.assignedVehicle;
      if (!vehicle) {
        return <span className="text-muted-foreground">-</span>;
      }
      return (
        <div className="flex gap-2">
          <div className="font-medium">{vehicle.name}</div>
          {vehicle.number && (
            <Badge variant="outline" className="text-xs">
              {vehicle.number}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Joined Date',
    cell: ({ row }) => {
      return format(new Date(row.original.createdAt), 'MMM dd, yyyy');
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const staff = row.original;

      const handleDelete = async () => {
        try {
          const result = await deleteStaff(staff.id);
          if (result.error) {
            toast.error(result.message);
          } else {
            toast.success(result.message);
            // Refresh the page to update the table
            window.location.reload();
          }
        } catch {
          toast.error('Failed to delete staff member');
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
                title="Delete Staff Member"
                description="Are you sure you want to delete this staff member? This action cannot be undone."
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

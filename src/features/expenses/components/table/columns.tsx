'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PopConfirm } from '@/components/ui/pop-confirm';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { deleteExpense } from '../../server/action';
import { toast } from 'sonner';
import { format } from 'date-fns';

export type Expense = {
  id: string;
  amount: number;
  description: string | null;
  expenseDate: Date;
  staff: {
    firstName: string;
    lastName: string;
  };
};

export const columns: ColumnDef<Expense>[] = [
  {
    accessorKey: 'expenseDate',
    header: 'Date & Time',
    cell: ({ row }) => {
      const date = row.getValue('expenseDate') as Date;
      return format(new Date(date), 'dd MMM yyyy, hh:mm a');
    },
  },
  {
    accessorKey: 'staff',
    header: 'Staff Member',
    cell: ({ row }) => {
      const staff = row.getValue('staff') as { firstName: string; lastName: string };
      return `${staff.firstName} ${staff.lastName}`;
    },
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
      const amount = row.getValue('amount') as number;
      return `₹${amount.toLocaleString('en-IN')}`;
    },
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => {
      const description = row.getValue('description') as string | null;
      return description || '-';
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const expense = row.original;

      const handleDelete = async () => {
        try {
          const result = await deleteExpense(expense.id);
          if (result.error) {
            toast.error(result.message);
          } else {
            toast.success(result.message);
            window.location.reload();
          }
        } catch {
          toast.error('Failed to delete expense');
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
                title="Delete Expense"
                description="Are you sure you want to delete this expense? This action cannot be undone."
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

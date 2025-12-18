'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useColumnPreferences } from '@/hooks/use-column-preferences';

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
};

// Define available column keys
const availableColumns = [
  'txnDate',
  'client',
  'amount',
  'paymentMode',
  'transactionStatus',
  'transactionReference',
  'paymentGateway',
  'installmentNumber',
  'notes',
];

export function TransactionDataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const { visibleColumns, setVisibleColumns, isLoaded } = useColumnPreferences();

  // Create column visibility object from preferences
  const visibleColumnsArray = visibleColumns?.split(',') || [];
  const columnVisibility = availableColumns.reduce(
    (acc, columnKey) => {
      acc[columnKey] = visibleColumnsArray.includes(columnKey);
      return acc;
    },
    {} as Record<string, boolean>
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
    onColumnVisibilityChange: (updaterOrValue) => {
      const newVisibility =
        typeof updaterOrValue === 'function' ? updaterOrValue(columnVisibility) : updaterOrValue;

      // Convert visibility state back to URL format
      const visibleColumnKeys = Object.entries(newVisibility)
        .filter(([, visible]) => visible)
        .map(([key]) => key);

      setVisibleColumns(visibleColumnKeys.join(','));
    },
  });

  const handleRowClick = (row: TData) => {
    const original = row as { payment?: { id?: string } };
    const paymentId = original.payment?.id;
    if (paymentId) {
      router.push(`/payments/${paymentId}`);
    }
  };

  // Show loading state until preferences are loaded
  if (!isLoaded) {
    return (
      <div className="rounded-md border p-8 text-center">
        <div>Loading table preferences...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => handleRowClick(row.original)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {table.getState().pagination.pageIndex * 50 + 1} to{' '}
          {Math.min((table.getState().pagination.pageIndex + 1) * 50, data.length)} of {data.length}{' '}
          transactions
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

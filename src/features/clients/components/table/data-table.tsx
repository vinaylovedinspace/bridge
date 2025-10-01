'use client';

import { ColumnDef, flexRender, getCoreRowModel, Row, useReactTable } from '@tanstack/react-table';
import { useColumnPreferences } from '@/hooks/use-column-preferences';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

// Define available column keys
const availableColumns = [
  'clientCode',
  'name',
  'phoneNumber',
  'paymentStatus',
  'completedSessions',
  'cancelledSessions',
  'remainingSessions',
  'completionStatus',
  'createdAt',
];

export function ClientDataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
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
    state: {
      columnVisibility,
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

  const handleRowClick = (row: Row<TData>) => {
    const original = row.original as { id?: string };
    if (original && original.id) {
      router.push(`/clients/${original.id}?step=personal`);
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
    <div className="rounded-md border">
      <Table data-testid="clients-table">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id} data-testid={`clients-table-header-${header.id}`}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const original = row.original as { id?: string; email?: string };
              const testId =
                original?.id || original?.email?.replace('@', '-').replace('.', '-') || row.id;
              return (
                <TableRow
                  key={row.id}
                  data-testid={`client-row-${testId}`}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => handleRowClick(row)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No clients found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

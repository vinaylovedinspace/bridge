'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useQueryState } from 'nuqs';
import { useColumnPreferences } from '@/hooks/use-column-preferences';
import { Settings } from 'lucide-react';

const paymentStatusOptions = [
  { value: 'ALL', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'FULLY_PAID', label: 'Fully Paid' },
  { value: 'NO_PAYMENT', label: 'No Payment' },
];

const columnOptions = [
  { key: 'clientCode', label: 'Client Code' },
  { key: 'name', label: 'Name' },
  { key: 'phoneNumber', label: 'Phone Number' },
  { key: 'email', label: 'Email' },
  { key: 'location', label: 'Location' },
  { key: 'paymentStatus', label: 'Payment Status' },
  { key: 'completedSessions', label: 'Completed Sessions' },
  { key: 'cancelledSessions', label: 'Cancelled Sessions' },
  { key: 'remainingSessions', label: 'Remaining Sessions' },
  { key: 'completionStatus', label: 'Completion Status' },
  { key: 'createdAt', label: 'Joined Date' },
];

export const ClientFilters = () => {
  const [name, setName] = useQueryState('name', {
    shallow: false,
    throttleMs: 500,
  });

  // const [paymentStatus, setPaymentStatus] = useQueryState('paymentStatus', {
  //   shallow: false,
  //   defaultValue: 'ALL',
  // });

  const { visibleColumns, setVisibleColumns } = useColumnPreferences();
  const visibleColumnsArray = visibleColumns?.split(',') || [];

  const toggleColumn = (columnKey: string) => {
    const currentColumns = visibleColumnsArray;
    const newColumns = currentColumns.includes(columnKey)
      ? currentColumns.filter((col) => col !== columnKey)
      : [...currentColumns, columnKey];

    setVisibleColumns(newColumns.join(','));
  };

  return (
    <div className="flex justify-between gap-4">
      <div className="flex gap-4">
        <Input
          data-testid="clients-search-input"
          value={name || ''}
          onChange={(e) => setName(e.target.value)}
          placeholder="Search by name"
          className="w-96"
        />
        {/* 
        <Select
          value={paymentStatus || 'ALL'}
          onValueChange={(value) => setPaymentStatus(value === 'ALL' ? null : value)}
        >
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            {paymentStatusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select> */}
      </div>
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Toggle Columns</h4>
              <div className="space-y-2">
                {columnOptions.map((column) => (
                  <div key={column.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={column.key}
                      checked={visibleColumnsArray.includes(column.key)}
                      onCheckedChange={() => toggleColumn(column.key)}
                    />
                    <label
                      htmlFor={column.key}
                      className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {column.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

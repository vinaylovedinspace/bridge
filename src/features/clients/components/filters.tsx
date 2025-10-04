'use client';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useQueryState } from 'nuqs';
import { useColumnPreferences } from '@/hooks/use-column-preferences';
import { Settings } from 'lucide-react';
import { ClientSearch } from './client-search';

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
  const [needsLearningTest, setNeedsLearningTest] = useQueryState('needsLearningTest', {
    shallow: false,
    parse: (value) => value === 'true',
    serialize: (value) => (value ? 'true' : ''),
  });

  const [needsDrivingTest, setNeedsDrivingTest] = useQueryState('needsDrivingTest', {
    shallow: false,
    parse: (value) => value === 'true',
    serialize: (value) => (value ? 'true' : ''),
  });

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
        <ClientSearch />
        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="needsLearningTest"
              checked={needsLearningTest || false}
              onCheckedChange={(checked) => setNeedsLearningTest(!!checked)}
            />
            <label
              htmlFor="needsLearningTest"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Pending LL
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="needsDrivingTest"
              checked={needsDrivingTest || false}
              onCheckedChange={(checked) => setNeedsDrivingTest(!!checked)}
            />
            <label
              htmlFor="needsDrivingTest"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Pending DL
            </label>
          </div>
        </div>
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

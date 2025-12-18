'use client';

import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';

type TransactionFiltersProps = {
  data: unknown[];
  onExport: () => void;
};

export const TransactionFilters = ({ onExport }: TransactionFiltersProps) => {
  const [name, setName] = useQueryState('name', {
    shallow: false,
    throttleMs: 500,
  });

  const [startDate, setStartDate] = useQueryState('startDate', {
    shallow: false,
  });

  const [endDate, setEndDate] = useQueryState('endDate', {
    shallow: false,
  });

  const clearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center gap-4">
        <div className="flex gap-4 ">
          <Input
            value={name || ''}
            onChange={(e) => setName(e.target.value)}
            placeholder="Search by client name"
            className="w-96"
          />
          <div className="flex gap-2 items-center">
            <DatePicker
              selected={startDate ? new Date(startDate) : null}
              onChange={(date) => setStartDate(date ? format(date, 'yyyy-MM-dd') : null)}
              placeholderText="Start date"
              className="w-50"
              maxDate={new Date()}
            />
            <span>to</span>
            <DatePicker
              selected={endDate ? new Date(endDate) : null}
              onChange={(date) => setEndDate(date ? format(date, 'yyyy-MM-dd') : null)}
              placeholderText="End date"
              className="w-50"
              maxDate={new Date()}
            />
            <Button variant="outline" size="sm" onClick={clearDateFilter}>
              Clear
            </Button>
          </div>
        </div>
        <Button variant="outline" onClick={onExport} className="w-40">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>
    </div>
  );
};

'use client';

import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createDateFilter } from '@/lib/date-time-utils';
import { useController, Control, FieldPath, FieldValues } from 'react-hook-form';
import { DEFAULT_WORKING_DAYS } from '@/lib/constants/business';

type DatePickerProps<TFieldValues extends FieldValues = FieldValues> = {
  selected?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholderText?: string;
  disabled?: (date: Date) => boolean;
  name?: string;
  control?: Control<TFieldValues>;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  workingDays?: number[]; // Array of working days (0=Sunday, 6=Saturday)
};

export function DatePicker<TFieldValues extends FieldValues = FieldValues>({
  selected,
  onChange,
  placeholderText = 'Select date',
  disabled,
  name,
  control,
  className,
  minDate = new Date('1900-01-01'),
  maxDate = new Date(),
  workingDays = DEFAULT_WORKING_DAYS, // Default to all days enabled
}: DatePickerProps<TFieldValues>) {
  // Create a date filter function that combines working days, provided disabled function, and min/max date constraints
  const dateFilter = React.useCallback(
    (date: Date) => {
      return createDateFilter(workingDays, disabled, minDate, maxDate)(date);
    },
    [workingDays, disabled, minDate, maxDate]
  );

  // If control and name are provided, use react-hook-form
  if (control && name) {
    return (
      <ControlledDatePicker
        name={name as FieldPath<TFieldValues>}
        control={control}
        disabled={disabled}
        className={className}
        minDate={minDate}
        maxDate={maxDate}
        workingDays={workingDays}
      />
    );
  }

  // Otherwise, use as an uncontrolled component
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full pl-3 text-left font-normal',
            !selected && 'text-muted-foreground',
            className
          )}
        >
          {selected ? format(selected, 'PPP') : <span>{placeholderText}</span>}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={selected as Date | undefined}
          onSelect={onChange as (date: Date | undefined) => void}
          disabled={dateFilter}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// Controlled version for react-hook-form
function ControlledDatePicker<TFieldValues extends FieldValues>({
  name,
  control,
  disabled,
  className,
  minDate,
  maxDate,
  workingDays = DEFAULT_WORKING_DAYS, // Default to all days enabled
}: Omit<DatePickerProps<TFieldValues>, 'selected' | 'onChange'> & {
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
}) {
  const {
    field: { value, onChange },
  } = useController({
    name,
    control,
  });

  const [inputValue, setInputValue] = React.useState(value ? format(value, 'dd/MM/yyyy') : '');
  const [open, setOpen] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  // Update input value when external value changes
  React.useEffect(() => {
    if (value) {
      setInputValue(format(value, 'dd/MM/yyyy'));
    } else {
      setInputValue('');
    }
  }, [value]);

  // Create a date filter function that combines working days, provided disabled function, and min/max date constraints
  const dateFilter = React.useCallback(
    (date: Date) => {
      return createDateFilter(
        workingDays,
        disabled,
        minDate || new Date('1900-01-01'),
        maxDate || new Date()
      )(date);
    },
    [workingDays, disabled, minDate, maxDate]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Try to parse the date in DD/MM/YYYY format
    if (newValue.length === 10) {
      const parsedDate = parse(newValue, 'dd/MM/yyyy', new Date());
      if (isValid(parsedDate) && !dateFilter(parsedDate)) {
        onChange(parsedDate);
      }
    } else if (newValue === '') {
      onChange(null);
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    // If input is invalid, reset to current value or empty
    if (inputValue && inputValue.length === 10) {
      const parsedDate = parse(inputValue, 'dd/MM/yyyy', new Date());
      if (!isValid(parsedDate) || dateFilter(parsedDate)) {
        setInputValue(value ? format(value, 'dd/MM/yyyy') : '');
      }
    }
  };

  const handleButtonFocus = () => {
    setIsFocused(true);
  };

  const handleButtonBlur = () => {
    setIsFocused(false);
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    onChange(date || null);
    setOpen(false);
  };

  return (
    <div
      className={cn(
        'flex w-full relative rounded-md',
        isFocused && 'ring-2 ring-ring ring-offset-2'
      )}
    >
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder="DD/MM/YYYY"
        className={cn(
          'rounded-r-none border-r-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none',
          className
        )}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="rounded-l-none px-3 border-l-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            type="button"
            onFocus={handleButtonFocus}
            onBlur={handleButtonBlur}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={value as Date | undefined}
            onSelect={handleCalendarSelect}
            disabled={dateFilter}
            defaultMonth={value as Date | undefined}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

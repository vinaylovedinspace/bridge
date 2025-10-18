'use client';

import * as React from 'react';
import { format, getHours, getMinutes } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createDateFilter } from '@/lib/date-time-utils';
import { useController, Control, FieldPath, FieldValues } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DEFAULT_WORKING_DAYS } from '@/lib/constants/business';

type DateTimePickerProps<TFieldValues extends FieldValues = FieldValues> = {
  selected?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholderText?: string;
  disabled?: (date: Date) => boolean;
  name?: string;
  control?: Control<TFieldValues>;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  disableDateChange?: boolean;
  workingDays?: number[]; // Array of working days (0=Sunday, 6=Saturday)
};

export function DateTimePicker<TFieldValues extends FieldValues = FieldValues>({
  selected,
  onChange,
  placeholderText = 'Select date and time',
  disabled,
  name,
  control,
  className,
  minDate = new Date('1900-01-01'),
  maxDate = new Date(2100, 0, 1),
  disableDateChange = false,
  workingDays = DEFAULT_WORKING_DAYS, // Default to all days enabled
}: DateTimePickerProps<TFieldValues>) {
  // Create a date filter function that combines working days, provided disabled function, and min/max date constraints
  const dateFilter = React.useCallback(
    (date: Date) => {
      return createDateFilter(workingDays, disabled, minDate, maxDate)(date);
    },
    [workingDays, disabled, minDate, maxDate]
  );

  // Time selection state
  const [hours, setHours] = React.useState<number>(selected ? getHours(selected) % 12 || 12 : 12);
  const [minutes, setMinutes] = React.useState<number>(selected ? getMinutes(selected) : 0);
  const [isPM, setIsPM] = React.useState<boolean>(selected ? getHours(selected) >= 12 : false);

  // Update time state when selected date changes
  React.useEffect(() => {
    if (selected) {
      setHours(selected.getHours() % 12 || 12);
      setMinutes(selected.getMinutes());
      setIsPM(selected.getHours() >= 12);
    }
  }, [selected]);

  // Handle time selection
  const handleTimeChange = (newHours: number, newMinutes: number, newIsPM: boolean) => {
    if (!selected || !onChange) return;

    const hours24 = newIsPM
      ? newHours === 12
        ? 12
        : newHours + 12
      : newHours === 12
        ? 0
        : newHours;

    // Create a new date preserving the selected date and applying the new time
    // We use the local date components to avoid timezone shifts
    const year = selected.getFullYear();
    const month = selected.getMonth();
    const day = selected.getDate();
    const newDate = new Date(year, month, day, hours24, newMinutes, 0, 0);

    onChange(newDate);
  };

  // Format the display value
  const getDisplayValue = () => {
    if (!selected) return placeholderText;
    if (!(selected instanceof Date)) return placeholderText;
    if (isNaN(selected.getTime())) return placeholderText;
    return `${format(selected, 'PPP')} at ${format(selected, 'h:mm a')}`;
  };

  // Generate hours options (1-12)
  const hoursOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  // Generate minutes options (00-55, step 5)
  const minutesOptions = Array.from({ length: 12 }, (_, i) => i * 5);

  // If control and name are provided, use react-hook-form
  if (control && name) {
    return (
      <ControlledDateTimePicker
        name={name as FieldPath<TFieldValues>}
        control={control}
        placeholderText={placeholderText}
        disabled={disabled}
        className={className}
        minDate={minDate}
        maxDate={maxDate}
        disableDateChange={disableDateChange}
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
          <span className="truncate">{getDisplayValue()}</span>
          <div className="ml-auto flex items-center">
            <CalendarIcon className="h-4 w-4 opacity-50 mr-2" />
            <Clock className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Date</span>
              </div>
              <CalendarComponent
                mode="single"
                selected={selected as Date | undefined}
                onSelect={
                  disableDateChange
                    ? undefined
                    : (date: Date | undefined) => {
                        if (!date || !onChange) {
                          onChange?.(date ?? null);
                          return;
                        }
                        // Preserve time when changing date (use local components)
                        const year = date.getFullYear();
                        const month = date.getMonth();
                        const day = date.getDate();

                        if (selected) {
                          const hours = selected.getHours();
                          const minutes = selected.getMinutes();
                          onChange(new Date(year, month, day, hours, minutes, 0, 0));
                        } else {
                          onChange(new Date(year, month, day, 12, 0, 0, 0));
                        }
                      }
                }
                disabled={disableDateChange ? () => true : dateFilter}
                initialFocus
              />
            </div>

            <div className="min-w-[180px]">
              <div className="flex items-center mb-2">
                <Clock className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Time</span>
              </div>

              {!selected ? (
                <p className="text-sm text-muted-foreground mt-2">Please select a date first</p>
              ) : (
                <div className="flex flex-col space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {/* Hours column */}
                    <div>
                      <p className="text-xs text-center mb-1 text-muted-foreground">Hour</p>
                      <Select
                        value={hours.toString()}
                        onValueChange={(val) => {
                          const newHours = parseInt(val, 10);
                          setHours(newHours);
                          handleTimeChange(newHours, minutes, isPM);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="HH" />
                        </SelectTrigger>
                        <SelectContent>
                          {hoursOptions.map((hour) => (
                            <SelectItem key={`hour-${hour}`} value={hour.toString()}>
                              {hour.toString().padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Minutes column */}
                    <div>
                      <p className="text-xs text-center mb-1 text-muted-foreground">Minute</p>
                      <Select
                        value={minutes.toString()}
                        onValueChange={(val) => {
                          const newMinutes = parseInt(val, 10);
                          setMinutes(newMinutes);
                          handleTimeChange(hours, newMinutes, isPM);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent>
                          {minutesOptions.map((minute) => (
                            <SelectItem key={`minute-${minute}`} value={minute.toString()}>
                              {minute.toString().padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* AM/PM column */}
                    <div>
                      <p className="text-xs text-center mb-1 text-muted-foreground">AM/PM</p>
                      <div className="grid grid-cols-1 gap-1">
                        <Button
                          type="button"
                          variant={isPM ? 'outline' : 'default'}
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setIsPM(false);
                            handleTimeChange(hours, minutes, false);
                          }}
                        >
                          AM
                        </Button>
                        <Button
                          type="button"
                          variant={isPM ? 'default' : 'outline'}
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setIsPM(true);
                            handleTimeChange(hours, minutes, true);
                          }}
                        >
                          PM
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Controlled version for react-hook-form
function ControlledDateTimePicker<TFieldValues extends FieldValues = FieldValues>({
  name,
  control,
  placeholderText = 'Select date and time',
  disabled,
  className,
  minDate = new Date('1900-01-01'),
  maxDate = new Date(2100, 0, 1),
  disableDateChange = false,
  workingDays = DEFAULT_WORKING_DAYS, // Default to all days enabled
}: Omit<DateTimePickerProps<TFieldValues>, 'selected' | 'onChange'> & {
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
}) {
  const {
    field: { value, onChange },
  } = useController({
    name,
    control,
  });

  // Create a date filter function that combines working days, provided disabled function, and min/max date constraints
  const dateFilter = React.useCallback(
    (date: Date) => {
      return createDateFilter(
        workingDays,
        disabled,
        minDate || new Date('1900-01-01'),
        maxDate || new Date(2100, 0, 1)
      )(date);
    },
    [workingDays, disabled, minDate, maxDate]
  );

  // Time selection state
  const [hours, setHours] = React.useState<number>(value ? value.getHours() % 12 || 12 : 12);
  const [minutes, setMinutes] = React.useState<number>(value ? value.getMinutes() : 0);
  const [isPM, setIsPM] = React.useState<boolean>(value ? value.getHours() >= 12 : false);

  // Update time state when value changes
  React.useEffect(() => {
    if (value) {
      setHours(value.getHours() % 12 || 12);
      setMinutes(value.getMinutes());
      setIsPM(value.getHours() >= 12);
    }
  }, [value]);

  // Handle time selection
  const handleTimeChange = (newHours: number, newMinutes: number, newIsPM: boolean) => {
    if (!value) return;

    const hours24 = newIsPM
      ? newHours === 12
        ? 12
        : newHours + 12
      : newHours === 12
        ? 0
        : newHours;

    // Create a new date preserving the selected date and applying the new time
    // We use the local date components to avoid timezone shifts
    const year = value.getFullYear();
    const month = value.getMonth();
    const day = value.getDate();
    const newDate = new Date(year, month, day, hours24, newMinutes, 0, 0);

    onChange(newDate);
  };

  // Format the display value
  const getDisplayValue = () => {
    if (!value) return placeholderText;
    // Type guard to ensure value is a Date
    const dateValue = value as Date;
    if (!(dateValue instanceof Date)) return placeholderText;
    if (isNaN(dateValue.getTime())) return placeholderText;
    return `${format(dateValue, 'PPP')} at ${format(dateValue, 'h:mm a')}`;
  };

  // Generate hours options (1-12)
  const hoursOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  // Generate minutes options (00-55, step 5)
  const minutesOptions = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full pl-3 text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{getDisplayValue()}</span>
          <div className="ml-auto flex items-center">
            <CalendarIcon className="h-4 w-4 opacity-50 mr-2" />
            <Clock className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Date</span>
              </div>
              <CalendarComponent
                mode="single"
                selected={value as Date | undefined}
                onSelect={
                  disableDateChange
                    ? undefined
                    : (date: Date | undefined) => {
                        if (!date) {
                          onChange(date);
                          return;
                        }
                        // Preserve time when changing date (use local components)
                        const year = date.getFullYear();
                        const month = date.getMonth();
                        const day = date.getDate();

                        if (value) {
                          const hours = value.getHours();
                          const minutes = value.getMinutes();
                          onChange(new Date(year, month, day, hours, minutes, 0, 0));
                        } else {
                          onChange(new Date(year, month, day, 12, 0, 0, 0));
                        }
                      }
                }
                disabled={disableDateChange ? () => true : dateFilter}
                initialFocus
              />
            </div>

            <div className="min-w-[180px]">
              <div className="flex items-center mb-2">
                <Clock className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Time</span>
              </div>

              {!value ? (
                <p className="text-sm text-muted-foreground mt-2">Please select a date first</p>
              ) : (
                <div className="flex flex-col space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {/* Hours column */}
                    <div>
                      <p className="text-xs text-center mb-1 text-muted-foreground">Hour</p>
                      <Select
                        value={hours.toString()}
                        onValueChange={(val) => {
                          const newHours = parseInt(val, 10);
                          setHours(newHours);
                          handleTimeChange(newHours, minutes, isPM);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="HH" />
                        </SelectTrigger>
                        <SelectContent>
                          {hoursOptions.map((hour) => (
                            <SelectItem key={`hour-${hour}`} value={hour.toString()}>
                              {hour.toString().padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Minutes column */}
                    <div>
                      <p className="text-xs text-center mb-1 text-muted-foreground">Minute</p>
                      <Select
                        value={minutes.toString()}
                        onValueChange={(val) => {
                          const newMinutes = parseInt(val, 10);
                          setMinutes(newMinutes);
                          handleTimeChange(hours, newMinutes, isPM);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent>
                          {minutesOptions.map((minute) => (
                            <SelectItem key={`minute-${minute}`} value={minute.toString()}>
                              {minute.toString().padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* AM/PM column */}
                    <div>
                      <p className="text-xs text-center mb-1 text-muted-foreground">AM/PM</p>
                      <div className="grid grid-cols-1 gap-1">
                        <Button
                          type="button"
                          variant={isPM ? 'outline' : 'default'}
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setIsPM(false);
                            handleTimeChange(hours, minutes, false);
                          }}
                        >
                          AM
                        </Button>
                        <Button
                          type="button"
                          variant={isPM ? 'default' : 'outline'}
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setIsPM(true);
                            handleTimeChange(hours, minutes, true);
                          }}
                        >
                          PM
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

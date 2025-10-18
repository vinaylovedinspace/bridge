'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TypographyP } from '@/components/ui/typography';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DateTimePicker } from '@/components/ui/date-time-picker';

import { addExpense, updateExpense } from '../server/action';
import { expenseFormSchema } from '../schemas/expense';
import { useRouter } from 'next/navigation';
import { Expense } from '@/server/db/expense';
import { extractDateTimeStrings } from '@/lib/date-time-utils';

type Staff = {
  id: string;
  firstName: string;
  lastName: string;
};

export function ExpenseForm({ expense, staff }: { expense?: Expense; staff: Staff[] }) {
  const form = useForm<z.infer<typeof expenseFormSchema>>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: expense?.amount || 0,
      description: expense?.description || '',
      expenseDate: expense?.expenseDate ? new Date(expense.expenseDate) : new Date(),
      staffId: expense?.staffId || '',
    },
  });

  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function onSubmit(values: z.infer<typeof expenseFormSchema>) {
    setIsPending(true);
    try {
      // Extract date and time as strings to avoid timezone conversion issues
      const { dateString, timeString } = extractDateTimeStrings(values.expenseDate);

      const dataToSubmit = {
        ...values,
        expenseDateString: dateString,
        expenseTimeString: timeString,
      };

      let result;

      if (expense?.id) {
        result = await updateExpense(expense.id, dataToSubmit);
      } else {
        result = await addExpense(dataToSubmit);
      }

      if (result.error) {
        toast.error(result.message || 'Failed to process expense data');
      } else {
        toast.success(result.message);
        if (!expense?.id) {
          form.reset();
        }
      }
    } catch (error) {
      console.log(error);
      toast.error('Something went wrong');
    } finally {
      setIsPending(false);
      router.push('/expenses');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" id="expense-form">
        <div className="grid grid-cols-12 w-full">
          <TypographyP className="col-span-3 font-medium">Expense Details</TypographyP>

          <div className="col-span-9 gap-6 flex flex-col">
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter amount"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value === '' ? 0 : Number(value);
                          field.onChange(isNaN(numValue) ? 0 : numValue);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Staff Member</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staff.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.firstName} {member.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="expenseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & Time</FormLabel>
                    <FormControl>
                      <DateTimePicker
                        selected={field.value}
                        onChange={field.onChange}
                        placeholderText="Select date and time"
                        maxDate={new Date(2100, 0, 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter description" className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button type="submit" disabled={isPending} id="submit-expense">
          {isPending ? 'Submitting...' : expense?.id ? 'Update' : 'Submit'}
        </Button>
      </form>
    </Form>
  );
}

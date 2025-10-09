import { z } from 'zod';

export const expenseFormSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  description: z.string().optional(),
  expenseDate: z.date(),
  staffId: z.string().min(1, 'Staff member is required'),
});

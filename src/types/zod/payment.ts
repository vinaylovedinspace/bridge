import {
  FullPaymentTable,
  InstallmentPaymentTable,
  PaymentModeEnum,
  PaymentStatusEnum,
  PaymentTable,
  PaymentTypeEnum,
} from '@/db/schema';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const paymentSchema = createInsertSchema(PaymentTable, {
  discount: z.number().default(0),
  paymentType: z
    .enum(PaymentTypeEnum.enumValues, { required_error: 'Payment type is required' })
    .default('FULL_PAYMENT'),
  paymentStatus: z
    .enum(PaymentStatusEnum.enumValues, { required_error: 'Payment status is required' })
    .default('PENDING'),
  licenseServiceFee: z.number().default(0),
  branchId: z.string().optional(), // Optional for client-side validation, added server-side
})
  .omit({ createdAt: true, updatedAt: true })
  .extend({
    paymentMode: z
      .enum(PaymentModeEnum.enumValues, { required_error: 'Payment mode is required' })
      .default('CASH'),
    // UI-only field to track discount checkbox state
    applyDiscount: z.boolean().default(false).optional(),
  });

export const fullPaymentSchema = createInsertSchema(FullPaymentTable, {
  paymentDate: z.string().nullable().optional(),
  paymentMode: z
    .enum(PaymentModeEnum.enumValues, { required_error: 'Payment mode is required' })
    .default('CASH'),
  isPaid: z.boolean().default(false),
}).omit({ createdAt: true, updatedAt: true });

export const installmentPaymentSchema = createInsertSchema(InstallmentPaymentTable, {
  installmentNumber: z.number().min(1).max(2),
  amount: z.number().min(0, 'Installment amount cannot be negative'),
  paymentDate: z.string().nullable().optional(),
  paymentMode: z
    .enum(PaymentModeEnum.enumValues, { required_error: 'Payment mode is required' })
    .default('CASH'),
  isPaid: z.boolean().default(false),
}).omit({ createdAt: true, updatedAt: true });

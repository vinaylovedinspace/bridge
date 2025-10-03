/**
 * Utility functions for payment calculations
 * Used by both frontend and backend to ensure consistent calculations
 */

import { PaymentTypeEnum } from '@/db/schema/payment/columns';

export type PaymentCalculationInput = {
  sessions: number;
  duration: number;
  rate: number;
  discount: number;
  paymentType: (typeof PaymentTypeEnum.enumValues)[number];
};

export type PaymentCalculationResult = {
  originalAmount: number;
  discount: number;
  finalAmount: number;
  firstInstallmentAmount: number;
  secondInstallmentAmount: number;
};

/**
 * Calculate payment breakdown based on plan and vehicle data
 * Returns the complete payment structure including installment splits
 */
export function calculatePaymentBreakdown({
  sessions,
  duration,
  rate,
  discount,
  paymentType,
}: PaymentCalculationInput): PaymentCalculationResult {
  // Ensure all values are numbers and positive
  const safeSessionCount = Math.max(0, Number(sessions) || 0);
  const safeDuration = Math.max(0, Number(duration) || 0);
  const safeRate = Math.max(0, Number(rate) || 0);
  const safeDiscount = Math.max(0, Number(discount) || 0);

  // Calculate half-hour blocks, rounding up
  const halfHourBlocks = Math.ceil(safeDuration / 30);

  // Calculate original amount
  const originalAmount = safeSessionCount * halfHourBlocks * safeRate;

  // Calculate final amount after discount
  const finalAmount = Math.max(0, originalAmount - safeDiscount);

  // Calculate installment amounts if applicable
  let firstInstallmentAmount = 0;
  let secondInstallmentAmount = 0;

  if (paymentType === 'INSTALLMENTS') {
    firstInstallmentAmount = Math.ceil(finalAmount / 2);
    secondInstallmentAmount = finalAmount - firstInstallmentAmount;
  }

  return {
    originalAmount,
    discount: safeDiscount,
    finalAmount,
    firstInstallmentAmount,
    secondInstallmentAmount,
  };
}

/**
 * Format a number as currency (INR)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate the outstanding amount (remaining unpaid balance) based on payment data
 * Handles all payment statuses and types consistently
 */
export type PaymentData = {
  paymentType: 'FULL_PAYMENT' | 'INSTALLMENTS' | null;
  paymentStatus: 'PENDING' | 'PARTIALLY_PAID' | 'FULLY_PAID' | null;
  finalAmount: number;
  installmentPayments?: Array<{
    installmentNumber: number;
    amount: number;
    isPaid: boolean | null;
  }>;
  fullPayment?: {
    isPaid: boolean | null;
  };
};

export function calculateOutstandingAmount(payment: PaymentData | null | undefined): number {
  if (!payment) {
    return 0;
  }

  const { paymentType, finalAmount, paymentStatus } = payment;

  // Handle null values - default to PENDING and FULL_PAYMENT
  const safePaymentType = paymentType || 'FULL_PAYMENT';
  const safePaymentStatus = paymentStatus || 'PENDING';

  // If fully paid, no amount is due
  if (safePaymentStatus === 'FULLY_PAID') {
    return 0;
  }

  // If pending (not paid at all), full amount is due
  if (safePaymentStatus === 'PENDING') {
    return finalAmount;
  }

  // For partially paid status
  if (safePaymentStatus === 'PARTIALLY_PAID') {
    if (safePaymentType === 'INSTALLMENTS' && payment.installmentPayments) {
      // Sum all paid installments
      const totalPaid = payment.installmentPayments
        .filter((installment) => installment.isPaid)
        .reduce((sum, installment) => sum + installment.amount, 0);

      return Math.max(0, finalAmount - totalPaid);
    }

    // For full payment that's partially paid (shouldn't happen, but handle it)
    if (safePaymentType === 'FULL_PAYMENT' && payment.fullPayment) {
      return payment.fullPayment.isPaid ? 0 : finalAmount;
    }
  }

  // Fallback: return full amount
  return finalAmount;
}

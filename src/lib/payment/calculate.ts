/**
 * Utility functions for payment calculations
 * Used by both frontend and backend to ensure consistent calculations
 */

import { PaymentTypeEnum } from '@/db/schema/payment/columns';
import { DEFAULT_SESSION_DAYS, DEFAULT_SESSION_MINUTES } from '../constants/business';

/**
 * Payment calculation constants
 */
export const PAYMENT_CONSTANTS = {
  /** Standard session block duration in minutes */
  SESSION_BLOCK_MINUTES: 30,
  /** Minimum allowed discount percentage (0%) */
  MIN_DISCOUNT_PERCENT: 0,
  /** Maximum allowed discount percentage (100%) */
  MAX_DISCOUNT_PERCENT: 100,
  /** Installment split ratio (50/50) */
  INSTALLMENT_SPLIT_RATIO: 0.5,
} as const;

export type PaymentCalculationResult = {
  originalAmount: number;
  discount: number;
  finalAmount: number;
  firstInstallmentAmount: number;
  secondInstallmentAmount: number;
};

export type PaymentCalculationInput = {
  sessions: number;
  duration: number;
  rate: number;
  discount: number;
  paymentType: (typeof PaymentTypeEnum.enumValues)[number];
  licenseServiceFee: number;
};

/**
 * Calculate payment breakdown based on plan and vehicle data
 * Returns the complete payment structure including installment splits
 *
 * @param input - Payment calculation parameters
 * @returns Complete payment breakdown with installment amounts
 * @throws Error if inputs are invalid or discount exceeds original amount
 *
 * @example
 * // Full payment with no discount
 * calculatePaymentBreakdown({
 *   sessions: 21,
 *   duration: 30,
 *   rate: 100,
 *   discount: 0,
 *   paymentType: 'FULL_PAYMENT'
 * })
 * // Returns: { originalAmount: 2100, discount: 0, finalAmount: 2100, ... }
 *
 * @example
 * // Installment payment with discount
 * calculatePaymentBreakdown({
 *   sessions: 10,
 *   duration: 60,
 *   rate: 100,
 *   discount: 500,
 *   paymentType: 'INSTALLMENTS'
 * })
 * // Returns: { originalAmount: 2000, discount: 500, finalAmount: 1500, firstInstallmentAmount: 750, secondInstallmentAmount: 750 }
 */
export function calculateEnrollmentPaymentBreakdown({
  sessions,
  duration,
  rate,
  discount,
  paymentType,
  licenseServiceFee,
}: PaymentCalculationInput): PaymentCalculationResult {
  // Ensure all values are numbers and positive
  const safeSessionCount = Number(sessions) ?? DEFAULT_SESSION_DAYS;
  const safeDuration = Number(duration) ?? DEFAULT_SESSION_MINUTES;
  const safeRate = Number(rate) ?? 0;
  const safeDiscount = Number(discount) ?? 0;
  const safeLicenseServiceFee = Number(licenseServiceFee) ?? 0;

  // Calculate half-hour blocks, rounding up
  const halfHourBlocks = Math.ceil(safeDuration / PAYMENT_CONSTANTS.SESSION_BLOCK_MINUTES);

  // Calculate original amount
  const trainingFees = safeSessionCount * halfHourBlocks * safeRate;

  const originalAmount = trainingFees + safeLicenseServiceFee;

  // Calculate final amount after discount
  const finalAmount = Math.max(0, originalAmount - safeDiscount);

  // Calculate installment amounts if applicable
  let firstInstallmentAmount = 0;
  let secondInstallmentAmount = 0;

  if (paymentType === 'INSTALLMENTS') {
    firstInstallmentAmount = Math.ceil(finalAmount * PAYMENT_CONSTANTS.INSTALLMENT_SPLIT_RATIO);
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
 *
 * @param amount - The amount to format
 * @returns Formatted currency string in INR format (e.g., "₹1,234")
 *
 * @example
 * formatCurrency(1234.56) // Returns: "₹1,235"
 * formatCurrency(0) // Returns: "₹0"
 */
export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid amount for currency formatting: ${amount}`);
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Payment data structure for outstanding amount calculations
 */
export type PaymentData = {
  paymentType: 'FULL_PAYMENT' | 'INSTALLMENTS' | null;
  paymentStatus: 'PENDING' | 'PARTIALLY_PAID' | 'FULLY_PAID' | null;
  finalAmount: number;
  discount?: number | null;
  installmentPayments?: Array<{
    installmentNumber: number;
    amount: number;
    isPaid: boolean | null;
  }>;
  fullPayment?: {
    isPaid: boolean | null;
  };
};

/**
 * Calculate the outstanding amount (remaining unpaid balance) based on payment data
 * Handles all payment statuses and types consistently
 *
 * @param payment - Payment data object or null/undefined
 * @returns Outstanding amount to be paid (0 if fully paid or no payment data)
 *
 * @example
 * // Fully paid - returns 0
 * calculateOutstandingAmount({
 *   paymentType: 'FULL_PAYMENT',
 *   paymentStatus: 'FULLY_PAID',
 *   finalAmount: 5000
 * }) // Returns: 0
 *
 * @example
 * // Pending - returns full amount
 * calculateOutstandingAmount({
 *   paymentType: 'FULL_PAYMENT',
 *   paymentStatus: 'PENDING',
 *   finalAmount: 5000
 * }) // Returns: 5000
 *
 * @example
 * // Partially paid installments - returns remaining amount
 * calculateOutstandingAmount({
 *   paymentType: 'INSTALLMENTS',
 *   paymentStatus: 'PARTIALLY_PAID',
 *   finalAmount: 5000,
 *   installmentPayments: [
 *     { installmentNumber: 1, amount: 2500, isPaid: true },
 *     { installmentNumber: 2, amount: 2500, isPaid: false }
 *   ]
 * }) // Returns: 2500
 */
export function calculateOutstandingAmount(payment: PaymentData | null | undefined): number {
  if (!payment) {
    return 0;
  }

  const { paymentType, finalAmount, paymentStatus } = payment;

  // Validate final amount
  if (finalAmount < 0 || !Number.isFinite(finalAmount)) {
    throw new Error(`Invalid final amount in payment data: ${finalAmount}`);
  }

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

/**
 * Calculate amount due for current payment, accounting for existing payments and discount changes
 *
 * @param params - Calculation parameters
 * @returns Amount currently due to be paid
 *
 * @example
 * // New enrollment with full payment
 * calculateAmountDue({
 *   existingPayment: null,
 *   totalFees: 5000,
 *   discount: 500,
 *   paymentType: 'FULL_PAYMENT',
 *   firstInstallmentAmount: 0
 * }) // Returns: 4500
 *
 * @example
 * // Installment payment - first installment due
 * calculateAmountDue({
 *   existingPayment: null,
 *   totalFees: 5000,
 *   discount: 0,
 *   paymentType: 'INSTALLMENTS',
 *   firstInstallmentAmount: 2500
 * }) // Returns: 2500
 */
export function calculateAmountDue({
  existingPayment,
  totalFees,
  discount = 0,
  paymentType,
  firstInstallmentAmount = 0,
}: {
  existingPayment: PaymentData | null | undefined;
  totalFees: number;
  discount?: number;
  paymentType?: 'FULL_PAYMENT' | 'INSTALLMENTS';
  firstInstallmentAmount?: number;
}): number {
  if (totalFees < 0 || !Number.isFinite(totalFees)) {
    throw new Error(`Invalid total fees: ${totalFees}`);
  }

  if (existingPayment) {
    // Check if discount has changed from the stored value
    const currentDiscount = discount ?? 0;
    const storedDiscount = existingPayment.discount ?? 0;

    if (currentDiscount !== storedDiscount) {
      // Discount has changed - recalculate based on new values
      const finalAmount = totalFees - currentDiscount;

      // Check what has already been paid
      const alreadyPaid = existingPayment.finalAmount - calculateOutstandingAmount(existingPayment);

      // New amount due = new final amount - what's already been paid
      return Math.max(0, finalAmount - alreadyPaid);
    } else {
      // Discount unchanged - use existing calculation
      return calculateOutstandingAmount(existingPayment);
    }
  } else {
    // For new enrollments, calculate from form values
    const finalAmount = totalFees - (discount ?? 0);
    if (paymentType === 'INSTALLMENTS') {
      // For installments, show first installment as amount due
      return firstInstallmentAmount;
    } else {
      // For full payment, show total final amount
      return finalAmount;
    }
  }
}

/**
 * RTO Payment Calculation Input
 */
export type RTOPaymentCalculationInput = {
  governmentFees: number;
  serviceCharge: number;
  branchServiceCharge: number;
  discount?: number;
};

/**
 * RTO Payment Calculation Result
 */
export type RTOPaymentCalculationResult = {
  governmentFees: number;
  serviceCharge: number;
  branchServiceCharge: number;
  originalAmount: number;
  discount: number;
  finalAmount: number;
};

/**
 * Calculate RTO service payment amounts
 * Shared function used by both frontend and backend to ensure consistency
 *
 * @param input - RTO payment calculation parameters
 * @returns Complete payment breakdown for RTO services
 * @throws Error if inputs are invalid
 *
 * @example
 * calculateRTOPaymentBreakdown({
 *   governmentFees: 716,
 *   serviceCharge: 434,
 *   branchServiceCharge: 500,
 *   discount: 100
 * })
 * // Returns: { originalAmount: 1650, finalAmount: 1550, ... }
 */
export function calculateRTOPaymentBreakdown({
  governmentFees,
  serviceCharge,
  branchServiceCharge,
  discount = 0,
}: RTOPaymentCalculationInput): RTOPaymentCalculationResult {
  // Calculate amounts
  const originalAmount = governmentFees + serviceCharge + branchServiceCharge;

  const finalAmount = Math.max(0, originalAmount - discount);

  return {
    governmentFees,
    serviceCharge,
    branchServiceCharge,
    originalAmount,
    discount,
    finalAmount,
  };
}

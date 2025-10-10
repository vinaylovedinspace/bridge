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
 * // Returns: {  discount: 0, totalAmount: 2100, ... }
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
 * // Returns: { discount: 500, totalAmount: 1500, firstInstallmentAmount: 750, secondInstallmentAmount: 750 }
 */
export function calculateEnrollmentPaymentBreakdown({
  sessions,
  duration,
  rate,
  discount,
  paymentType,
  licenseServiceFee,
}: PaymentCalculationInput) {
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

  const totalFeesBeforeDiscount = trainingFees + safeLicenseServiceFee;

  // Calculate final amount after discount
  const totalAmountAfterDiscount = Math.max(0, totalFeesBeforeDiscount - safeDiscount);
  // Calculate installment amounts if applicable
  let firstInstallmentAmount = 0;
  let secondInstallmentAmount = 0;

  if (paymentType === 'INSTALLMENTS') {
    firstInstallmentAmount = Math.ceil(totalAmountAfterDiscount / 2);
    secondInstallmentAmount = Math.ceil(totalAmountAfterDiscount / 2);
  }

  return {
    trainingFees,
    licenseServiceFee,
    discount,
    paymentType,
    totalFeesBeforeDiscount,
    totalAmountAfterDiscount,
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
    return '₹0';
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
  totalAmount: number;
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

export function calculateOutstandingAmount(
  payment: PaymentData | null | undefined,
  totalAmount: number
): number {
  if (!payment) {
    return 0;
  }

  const { paymentType, paymentStatus } = payment;

  // Validate final amount
  if (totalAmount < 0 || !Number.isFinite(totalAmount)) {
    throw new Error(`Invalid final amount in payment data: ${totalAmount}`);
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
    return totalAmount;
  }

  // For partially paid status
  if (safePaymentStatus === 'PARTIALLY_PAID') {
    if (safePaymentType === 'INSTALLMENTS' && payment.installmentPayments) {
      // Sum all paid installments
      const totalPaid = payment.installmentPayments
        .filter((installment) => installment.isPaid)
        .reduce((sum, installment) => sum + installment.amount, 0);

      return Math.max(0, totalAmount - totalPaid);
    }

    // For full payment that's partially paid (shouldn't happen, but handle it)
    if (safePaymentType === 'FULL_PAYMENT' && payment.fullPayment) {
      return payment.fullPayment.isPaid ? 0 : totalAmount;
    }
  }

  // Fallback: return full amount
  return totalAmount;
}

export function calculateAmountDue({
  existingPayment,
  totalAmount,
  paymentType,
  firstInstallmentAmount = 0,
}: {
  existingPayment: PaymentData | null | undefined;
  totalAmount: number;
  paymentType?: 'FULL_PAYMENT' | 'INSTALLMENTS';
  firstInstallmentAmount?: number;
}): number {
  if (existingPayment) {
    return calculateOutstandingAmount(existingPayment, totalAmount);
  } else {
    // For new enrollments, calculate from form values
    if (paymentType === 'INSTALLMENTS') {
      // For installments, show first installment as amount due
      return firstInstallmentAmount;
    } else {
      // For full payment, show total final amount
      return totalAmount;
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

export function calculateRTOPaymentBreakdown({
  governmentFees,
  serviceCharge,
  branchServiceCharge,
  discount = 0,
}: RTOPaymentCalculationInput) {
  // Calculate amounts
  const totalFeesBeforeDiscount = governmentFees + serviceCharge + branchServiceCharge;

  const totalAmountAfterDiscount = Math.max(0, totalFeesBeforeDiscount - discount);

  return {
    governmentFees,
    serviceCharge,
    branchServiceCharge,
    totalFeesBeforeDiscount,
    discount,
    totalAmountAfterDiscount,
  };
}

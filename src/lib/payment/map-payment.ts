import { PaymentValues } from '@/features/enrollment/types';
import { PaymentStatus, PaymentType } from '@/db/schema/payment/columns';

type PaymentData = {
  id: string;
  discount: number;
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
  licenseServiceFee: number;
  totalAmount: number;
  clientId: string;
  branchId: string;
};

/**
 * Maps payment data from database to form values
 * Used by both enrollment and RTO service forms
 */
export const mapPayment = (
  payment: PaymentData | null | undefined,
  fallbackClientId: string,
  fallbackBranchId: string
): PaymentValues => {
  if (payment) {
    return {
      id: payment.id,
      discount: payment.discount,
      paymentType: payment.paymentType || 'FULL_PAYMENT',
      paymentStatus: payment.paymentStatus || 'PENDING',
      licenseServiceFee: payment.licenseServiceFee,
      totalAmount: payment.totalAmount,
      clientId: payment.clientId,
      branchId: payment.branchId,
      paymentMode: 'CASH' as const,
      applyDiscount: payment.discount > 0,
    };
  }

  return {
    discount: 0,
    paymentType: 'FULL_PAYMENT' as const,
    paymentStatus: 'PENDING' as const,
    licenseServiceFee: 0,
    totalAmount: 0,
    clientId: fallbackClientId,
    branchId: fallbackBranchId,
    paymentMode: 'CASH' as const,
    applyDiscount: false,
  };
};

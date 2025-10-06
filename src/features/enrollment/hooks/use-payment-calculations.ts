import { useFormContext } from 'react-hook-form';
import { AdmissionFormValues } from '@/features/enrollment/types';
import { useVehicle } from '@/hooks/vehicles';
import {
  calculatePaymentBreakdown,
  calculateOutstandingAmount,
  formatCurrency,
} from '@/lib/payment/calculate';
import { Enrollment } from '@/server/db/plan';

const DEFAULT_SESSION_DAYS = 21;
const DEFAULT_SESSION_MINUTES = 30;

type UsePaymentCalculationsProps = {
  existingPayment: NonNullable<Enrollment>['payment'];
};

type InstallmentPaymentInfo = {
  installmentNumber: number;
  amount: number;
  isPaid: boolean | null;
  paymentMode?: string;
};

export const usePaymentCalculations = ({ existingPayment }: UsePaymentCalculationsProps) => {
  const { watch } = useFormContext<AdmissionFormValues>();
  const plan = watch('plan');
  const discount = watch('payment.discount');
  const paymentType = watch('payment.paymentType');
  const applyDiscount = watch('payment.applyDiscount');

  const { data: vehicle } = useVehicle(plan?.vehicleId || '');

  // Extract installment payment info
  const firstInstallmentPayment = existingPayment?.installmentPayments?.find(
    (installment) => installment.installmentNumber === 1 && installment.isPaid
  );

  const secondInstallmentPayment = existingPayment?.installmentPayments?.find(
    (installment) => installment.installmentNumber === 2 && installment.isPaid
  );

  const isFirstInstallmentPaid = firstInstallmentPayment?.isPaid ?? false;
  const isSecondInstallmentPaid = secondInstallmentPayment?.isPaid ?? false;

  // Calculate payment breakdown
  const {
    originalAmount: totalFees,
    firstInstallmentAmount,
    secondInstallmentAmount,
  } = calculatePaymentBreakdown({
    sessions: plan?.numberOfSessions ?? DEFAULT_SESSION_DAYS,
    duration: plan?.sessionDurationInMinutes ?? DEFAULT_SESSION_MINUTES,
    rate: vehicle?.rent ?? 0,
    discount: discount ?? 0,
    paymentType: paymentType ?? 'FULL_PAYMENT',
  });

  // Calculate amount due
  const amountDue = calculateAmountDue({
    existingPayment,
    discount,
    paymentType,
    totalFees,
    firstInstallmentAmount,
  });

  // Format all amounts
  const formatted = {
    totalFees: formatCurrency(totalFees),
    discount: discount && discount > 0 ? formatCurrency(discount) : null,
    firstInstallment: formatCurrency(firstInstallmentPayment?.amount ?? firstInstallmentAmount),
    secondInstallment: formatCurrency(secondInstallmentAmount),
    amountDue: formatCurrency(amountDue),
  };

  const isCheckboxChecked =
    applyDiscount || (discount && discount > 0) || paymentType === 'INSTALLMENTS';

  return {
    // Raw values
    totalFees,
    discount,
    paymentType,
    firstInstallmentAmount,
    secondInstallmentAmount,
    amountDue,

    // Formatted values
    formatted,

    // Installment info
    firstInstallmentPayment: firstInstallmentPayment as InstallmentPaymentInfo | undefined,
    secondInstallmentPayment: secondInstallmentPayment as InstallmentPaymentInfo | undefined,
    isFirstInstallmentPaid,
    isSecondInstallmentPaid,

    // UI states
    isCheckboxChecked,
  };
};

// Helper function to calculate amount due
function calculateAmountDue({
  existingPayment,
  discount,
  paymentType,
  totalFees,
  firstInstallmentAmount,
}: {
  existingPayment: NonNullable<Enrollment>['payment'];
  discount: number | undefined;
  paymentType: 'FULL_PAYMENT' | 'INSTALLMENTS' | undefined;
  totalFees: number;
  firstInstallmentAmount: number;
}): number {
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

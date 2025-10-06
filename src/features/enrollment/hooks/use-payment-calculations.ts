import { useFormContext } from 'react-hook-form';
import { AdmissionFormValues } from '@/features/enrollment/types';
import { useVehicle } from '@/hooks/vehicles';
import {
  calculatePaymentBreakdown,
  calculateAmountDue,
  recalculateInstallments,
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
  const licenseServiceFee = watch('payment.licenseServiceFee');

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

  // Calculate payment breakdown (vehicle rental fees only)
  const {
    originalAmount: totalFees,
    firstInstallmentAmount: firstInstallmentAmountBase,
    secondInstallmentAmount: secondInstallmentAmountBase,
  } = calculatePaymentBreakdown({
    sessions: plan?.numberOfSessions ?? DEFAULT_SESSION_DAYS,
    duration: plan?.sessionDurationInMinutes ?? DEFAULT_SESSION_MINUTES,
    rate: vehicle?.rent ?? 0,
    discount: discount ?? 0,
    paymentType: paymentType ?? 'FULL_PAYMENT',
  });

  // Add license service fee to get grand total
  const licenseFee = licenseServiceFee ?? 0;
  const grandTotal = totalFees + licenseFee;

  // Recalculate installments including license fee using utility function
  let firstInstallmentAmount = firstInstallmentAmountBase;
  let secondInstallmentAmount = secondInstallmentAmountBase;

  if (paymentType === 'INSTALLMENTS') {
    const installments = recalculateInstallments(grandTotal, discount ?? 0);
    firstInstallmentAmount = installments.firstInstallment;
    secondInstallmentAmount = installments.secondInstallment;
  }

  // Calculate amount due using utility function
  const amountDue = calculateAmountDue({
    existingPayment,
    totalFees: grandTotal,
    discount,
    paymentType,
    firstInstallmentAmount,
  });

  // Format all amounts
  const formatted = {
    totalFees: formatCurrency(totalFees),
    licenseServiceFee:
      licenseServiceFee && licenseServiceFee > 0 ? formatCurrency(licenseServiceFee) : null,
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
    licenseServiceFee,
    grandTotal,
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

import { useFormContext } from 'react-hook-form';
import { AdmissionFormValues } from '@/features/enrollment/types';
import { useVehicle } from '@/hooks/vehicles';
import {
  calculateEnrollmentPaymentBreakdown,
  calculateAmountDue,
  formatCurrency,
} from '@/lib/payment/calculate';
import { Enrollment } from '@/server/db/plan';

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
  const licenseServiceFee = watch('payment.licenseServiceFee');

  const { data: vehicle } = useVehicle(plan?.vehicleId || '');

  // Calculate payment breakdown (vehicle rental fees only)
  const {
    originalAmount: totalFees,
    firstInstallmentAmount,
    secondInstallmentAmount,
  } = calculateEnrollmentPaymentBreakdown({
    sessions: plan?.numberOfSessions,
    duration: plan?.sessionDurationInMinutes,
    rate: vehicle?.rent ?? 0,
    discount,
    paymentType,
    licenseServiceFee,
  });

  // Extract installment payment info
  const firstInstallmentPayment = existingPayment?.installmentPayments?.find(
    (installment) => installment.installmentNumber === 1 && installment.isPaid
  );

  const secondInstallmentPayment = existingPayment?.installmentPayments?.find(
    (installment) => installment.installmentNumber === 2 && installment.isPaid
  );

  const isFirstInstallmentPaid = firstInstallmentPayment?.isPaid ?? false;
  const isSecondInstallmentPaid = secondInstallmentPayment?.isPaid ?? false;

  // Calculate amount due using utility function
  const amountDue = calculateAmountDue({
    existingPayment,
    totalFees,
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

  const isDiscountApplied = discount > 0;
  return {
    // Raw values
    totalFees,
    licenseServiceFee,
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
    isDiscountApplied,
  };
};

import { useFormContext } from 'react-hook-form';
import { AdmissionFormValues } from '@/features/enrollment/types';
import { useVehicle } from '@/hooks/vehicles';
import {
  calculateEnrollmentPaymentBreakdown,
  calculateAmountDue,
  formatCurrency,
} from '@/lib/payment/calculate';
import { Enrollment } from '@/server/db/plan';
import { branchServiceChargeAtom } from '@/lib/atoms/branch-config';
import { useAtomValue } from 'jotai';
import { calculateLicenseFees } from '@/lib/constants/rto-fees';
import { useEffect, useMemo } from 'react';

type UsePaymentCalculationsProps = {
  existingPayment: NonNullable<Enrollment>['payment'] | null;
  isEditMode?: boolean;
};

type InstallmentPaymentInfo = {
  installmentNumber: number;
  amount: number;
  isPaid: boolean | null;
  paymentMode?: string;
};

export const usePaymentCalculations = ({ existingPayment }: UsePaymentCalculationsProps) => {
  const branchServiceCharge = useAtomValue(branchServiceChargeAtom);
  const { watch, setValue } = useFormContext<AdmissionFormValues>();
  const plan = watch('plan');
  const discount = watch('payment.discount');
  const paymentType = watch('payment.paymentType');

  // Calculate license fee from selected classes
  const serviceType = watch('serviceType');
  const _selectedLicenseClasses = watch('learningLicense.class');

  const selectedLicenseClasses = useMemo(
    () => _selectedLicenseClasses ?? [],
    [_selectedLicenseClasses]
  );

  const excludeLearningLicenseFee = watch('learningLicense.excludeLearningLicenseFee') ?? false;
  const licenseServiceFee = watch('payment.licenseServiceFee');

  // Calculate fees breakdown for display (only if not excluded)
  const licenseFeeBreakdown = useMemo(() => {
    if (serviceType === 'FULL_SERVICE') {
      return calculateLicenseFees({
        licenseClasses: selectedLicenseClasses,
        excludeLearningLicenseFee,
        serviceCharge: branchServiceCharge,
      });
    }
    return null;
  }, [branchServiceCharge, excludeLearningLicenseFee, selectedLicenseClasses, serviceType]);

  const { data: vehicle } = useVehicle(plan?.vehicleId || '');

  // Use the calculated license fee total directly, or fall back to form value
  const effectiveLicenseServiceFee = licenseFeeBreakdown?.total ?? licenseServiceFee;

  // Update form value when fees change
  useEffect(() => {
    if (!licenseFeeBreakdown?.total) return;
    setValue('payment.licenseServiceFee', licenseFeeBreakdown?.total);
  }, [licenseFeeBreakdown?.total, setValue]);

  // Calculate payment breakdown (vehicle rental fees only)
  const {
    totalFeesBeforeDiscount,
    totalAmountAfterDiscount,
    trainingFees,
    firstInstallmentAmount,
    secondInstallmentAmount,
  } = calculateEnrollmentPaymentBreakdown({
    sessions: plan?.numberOfSessions,
    duration: plan?.sessionDurationInMinutes,
    rate: vehicle?.rent ?? 0,
    discount,
    paymentType,
    licenseServiceFee: effectiveLicenseServiceFee,
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
    totalAmount: totalAmountAfterDiscount,
    paymentType,
    firstInstallmentAmount,
  });

  // Update totalAmount in form when it changes
  useEffect(() => {
    setValue('payment.totalAmount', totalAmountAfterDiscount);
  }, [totalAmountAfterDiscount, setValue]);

  // Format all amounts
  const formatted = {
    totalAmountAfterDiscount: formatCurrency(totalAmountAfterDiscount),
    totalFeesBeforeDiscount: formatCurrency(totalFeesBeforeDiscount),
    trainingFees: formatCurrency(trainingFees),
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
    totalFeesBeforeDiscount,
    totalAmountAfterDiscount,
    trainingFees,
    licenseServiceFee,
    discount,
    paymentType,
    firstInstallmentAmount,
    secondInstallmentAmount,
    amountDue,

    // Formatted values
    formatted,

    // License fee breakdown
    licenseFeeBreakdown,

    // Installment info
    firstInstallmentPayment: firstInstallmentPayment as InstallmentPaymentInfo | undefined,
    secondInstallmentPayment: secondInstallmentPayment as InstallmentPaymentInfo | undefined,
    isFirstInstallmentPaid,
    isSecondInstallmentPaid,

    // UI states
    isDiscountApplied,
  };
};

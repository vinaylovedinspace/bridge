import { useFormContext } from 'react-hook-form';
import { RTOServiceFormValues } from '@/features/rto-services/types';
import { formatCurrency, calculateRTOPaymentBreakdown } from '@/lib/payment/calculate';
import { getRTOServiceCharges } from '@/lib/constants/rto-fees';
import { useAtomValue } from 'jotai';
import { branchServiceChargeAtom } from '@/lib/atoms/branch-config';
import { useEffect } from 'react';

export const useRTOPaymentCalculations = () => {
  const { watch, setValue } = useFormContext<RTOServiceFormValues>();
  const serviceType = watch('service.type');
  const discount = watch('payment.discount') ?? 0;
  const shouldApplyDiscount = watch('payment.applyDiscount');
  const paymentStatus = watch('payment.paymentStatus');

  // Get service charges based on RTO service type (uses max by default)
  const { governmentFees, additionalCharges, additionalChargesRange } =
    getRTOServiceCharges(serviceType);

  // Get branch service charge from Jotai atom
  const branchServiceCharge = useAtomValue(branchServiceChargeAtom);

  // Calculate amounts using shared function (ensures consistency with backend)
  const { totalFeesBeforeDiscount, totalAmountAfterDiscount } = calculateRTOPaymentBreakdown({
    governmentFees,
    serviceCharge: additionalCharges,
    branchServiceCharge,
    discount,
  });

  // If payment is fully paid, amount due should be 0
  const amountDue = paymentStatus === 'FULLY_PAID' ? 0 : totalAmountAfterDiscount;

  // Format all amounts
  const formattedValues = {
    governmentFees: formatCurrency(governmentFees),
    serviceCharge: formatCurrency(additionalCharges),
    branchServiceCharge: branchServiceCharge > 0 ? formatCurrency(branchServiceCharge) : null,
    discount: discount > 0 ? formatCurrency(discount) : null,
    amountDue: formatCurrency(amountDue),
  };

  const isDiscountApplied = shouldApplyDiscount ?? discount > 0;

  // Update totalAmount in form when it changes
  useEffect(() => {
    setValue('payment.totalAmount', totalAmountAfterDiscount);
  }, [totalAmountAfterDiscount, setValue]);

  // Update form value when fees change
  useEffect(() => {
    setValue('payment.licenseServiceFee', branchServiceCharge);
  }, [branchServiceCharge, setValue]);

  return {
    // Raw values
    totalFeesBeforeDiscount,
    totalAmountAfterDiscount,
    governmentFees,
    serviceCharge: additionalCharges,
    branchServiceCharge,
    discount,
    amountDue,

    // Formatted values
    formattedValues,

    // UI states
    isDiscountApplied,

    // Additional info
    additionalChargesRange,
  };
};

import { useFormContext } from 'react-hook-form';
import { RTOServiceFormValues } from '@/features/rto-services/types';
import { formatCurrency, calculateRTOPaymentBreakdown } from '@/lib/payment/calculate';
import { getRTOServiceCharges } from '@/lib/constants/rto-fees';
import { useAtomValue } from 'jotai';
import { branchServiceChargeAtom } from '@/lib/atoms/branch-config';

export const useRTOPaymentCalculations = () => {
  const { watch } = useFormContext<RTOServiceFormValues>();
  const serviceType = watch('service.type');
  const discountAmount = watch('payment.discount') ?? 0;
  const shouldApplyDiscount = watch('payment.applyDiscount');
  const paymentStatus = watch('payment.paymentStatus');

  // Get service charges based on RTO service type (uses max by default)
  const { governmentFees, additionalCharges, additionalChargesRange } =
    getRTOServiceCharges(serviceType);

  // Get branch service charge from Jotai atom
  const branchServiceCharge = useAtomValue(branchServiceChargeAtom);

  // Calculate amounts using shared function (ensures consistency with backend)
  const { originalAmount, finalAmount: finalAmountAfterDiscount } = calculateRTOPaymentBreakdown({
    governmentFees,
    serviceCharge: additionalCharges,
    branchServiceCharge,
    discount: discountAmount,
  });

  // If payment is fully paid, amount due should be 0
  const amountDue = paymentStatus === 'FULLY_PAID' ? 0 : finalAmountAfterDiscount;

  // Format all amounts
  const formattedValues = {
    governmentFees: formatCurrency(governmentFees),
    serviceCharge: formatCurrency(additionalCharges),
    branchServiceCharge: branchServiceCharge > 0 ? formatCurrency(branchServiceCharge) : null,
    discount: discountAmount > 0 ? formatCurrency(discountAmount) : null,
    amountDue: formatCurrency(amountDue),
  };

  const isDiscountApplied = shouldApplyDiscount || discountAmount > 0;

  return {
    // Raw values
    governmentFees,
    serviceCharge: additionalCharges,
    branchServiceCharge,
    originalAmount,
    discountAmount,
    finalAmountAfterDiscount,
    amountDue,

    // Formatted values
    formattedValues,

    // UI states
    isDiscountApplied,

    // Additional info
    additionalChargesRange,
  };
};

import { useFormContext } from 'react-hook-form';
import { RTOServiceFormValues } from '@/features/rto-services/types';
import { formatCurrency } from '@/lib/payment/calculate';
import { getRTOServiceCharges } from '@/features/rto-services/lib/charges';

export const useRTOPaymentCalculations = () => {
  const { watch } = useFormContext<RTOServiceFormValues>();
  const serviceType = watch('service.type');
  const discount = watch('payment.discount');
  const applyDiscount = watch('payment.applyDiscount');

  // Get service charges based on RTO service type
  const { governmentFees, additionalCharges } = getRTOServiceCharges(serviceType);

  // Calculate amounts
  const totalFees = governmentFees + additionalCharges.max;
  const discountValue = discount ?? 0;
  const finalAmount = totalFees - discountValue;
  const amountDue = finalAmount; // For RTO services, it's always FULL_PAYMENT (no installments)

  // Format all amounts
  const formatted = {
    governmentFees: formatCurrency(governmentFees),
    serviceCharge: formatCurrency(additionalCharges.max),
    discount: discountValue > 0 ? formatCurrency(discountValue) : null,
    amountDue: formatCurrency(amountDue),
  };

  const isDiscountApplied = applyDiscount || discountValue > 0;

  return {
    // Raw values
    governmentFees,
    serviceCharge: additionalCharges.max,
    totalFees,
    discount: discountValue,
    finalAmount,
    amountDue,

    // Formatted values
    formatted,

    // UI states
    isDiscountApplied,
  };
};

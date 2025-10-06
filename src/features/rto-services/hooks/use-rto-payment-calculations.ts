import { useFormContext } from 'react-hook-form';
import { RTOServiceFormValues } from '@/features/rto-services/types';
import { formatCurrency } from '@/lib/payment/calculate';
import { getRTOServiceCharges } from '@/features/rto-services/lib/charges';

export const useRTOPaymentCalculations = () => {
  const { watch } = useFormContext<RTOServiceFormValues>();
  const serviceType = watch('service.type');
  const discountAmount = watch('payment.discount') ?? 0;
  const shouldApplyDiscount = watch('payment.applyDiscount');
  const paymentStatus = watch('payment.paymentStatus');

  // Get service charges based on RTO service type
  const { governmentFees, additionalCharges } = getRTOServiceCharges(serviceType);

  // Calculate amounts
  const serviceChargeAmount = additionalCharges.max;
  const originalAmount = governmentFees + serviceChargeAmount;
  const finalAmount = originalAmount - discountAmount;

  // If payment is fully paid, amount due should be 0
  const amountDue = paymentStatus === 'FULLY_PAID' ? 0 : finalAmount;

  // Format all amounts
  const formatted = {
    governmentFees: formatCurrency(governmentFees),
    serviceCharge: formatCurrency(serviceChargeAmount),
    discount: discountAmount > 0 ? formatCurrency(discountAmount) : null,
    amountDue: formatCurrency(amountDue),
  };

  const isDiscountApplied = shouldApplyDiscount || discountAmount > 0;

  return {
    // Raw values
    governmentFees,
    serviceCharge: serviceChargeAmount,
    originalAmount,
    discountAmount,
    finalAmount,
    amountDue,

    // Formatted values
    formatted,

    // UI states
    isDiscountApplied,
  };
};

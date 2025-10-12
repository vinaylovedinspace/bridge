import { useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { RTOServiceFormValues } from '@/features/rto-services/types';
import { createPayment } from '@/features/rto-services/server/action';
import { useRTOPaymentCalculations } from '@/features/rto-services/hooks/use-rto-payment-calculations';
import { PaymentModeSelector as SharedPaymentModeSelector } from '@/components/payment/payment-mode-selector';
import { PaymentMode } from '@/db/schema';
import { useRouter } from 'next/navigation';

export const PaymentModeSelector = () => {
  const { getValues, setValue } = useFormContext<RTOServiceFormValues>();
  const { totalAmountAfterDiscount } = useRTOPaymentCalculations();
  const router = useRouter();

  const handleAcceptPayment = async () => {
    const formValues = getValues();
    const payment = formValues.payment;
    const clientId = formValues.client?.id;
    const rtoServiceId = formValues.service?.id;

    if (!clientId) {
      toast.error('Client ID not found. Please complete the personal information step first.');
      throw new Error('Client ID not found');
    }

    if (!rtoServiceId) {
      toast.error('RTO Service ID not found. Please complete the service step first.');
      throw new Error('RTO Service ID not found');
    }

    // If payment is empty, initialize with calculated values
    if (!payment || !payment.totalAmount) {
      setValue('payment.totalAmount', totalAmountAfterDiscount);
    }

    const result = await createPayment(
      {
        ...payment,
        clientId,
        totalAmount: totalAmountAfterDiscount,
      },
      rtoServiceId
    );

    if (!result.error) {
      toast.success(result.message || 'Payment processed successfully');
      router.push('/rto-services');
    } else {
      toast.error(result.message || 'Failed to process payment');
      throw new Error(result.message);
    }
  };

  const formValues = getValues();
  const customerName =
    `${formValues.client?.firstName || ''} ${formValues.client?.lastName || ''}`.trim();

  const handlePaymentModeChange = (mode: PaymentMode) => {
    setValue('payment.paymentMode', mode);
  };

  return (
    <SharedPaymentModeSelector
      phoneNumber={formValues.client?.phoneNumber}
      customerName={customerName}
      paymentId={formValues.payment.id}
      amount={totalAmountAfterDiscount}
      buttonText="Accept Payment"
      onAcceptPayment={handleAcceptPayment}
      handlePaymentModeChange={handlePaymentModeChange}
    />
  );
};

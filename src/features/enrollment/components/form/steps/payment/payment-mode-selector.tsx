import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { AdmissionFormValues } from '@/features/enrollment/types';
import { toast } from 'sonner';
import { updatePaymentAndProcessTransaction } from '@/features/enrollment/server/action';
import { Enrollment } from '@/server/db/plan';
import { PaymentModeSelector as SharedPaymentModeSelector } from '@/components/payment/payment-mode-selector';
import { PaymentMode } from '@/db/schema';
import { useRouter } from 'next/navigation';

type PaymentModeSelectorProps = {
  existingPayment: NonNullable<Enrollment>['payment'] | null;
};

export const PaymentModeSelector = ({ existingPayment }: PaymentModeSelectorProps) => {
  const router = useRouter();
  const { getValues, setValue } = useFormContext<AdmissionFormValues>();

  // Check if this is installment payment and if 1st installment is paid
  const isFirstInstallmentPaid = useMemo(() => {
    if (!existingPayment || existingPayment.paymentType !== 'INSTALLMENTS') {
      return false;
    }
    const firstInstallment = existingPayment.installmentPayments?.find(
      (inst) => inst.installmentNumber === 1
    );
    return firstInstallment?.isPaid ?? false;
  }, [existingPayment]);

  const buttonText = useMemo(() => {
    if (isFirstInstallmentPaid) {
      return 'Accept 2nd Installment';
    }
    return 'Accept Payment';
  }, [isFirstInstallmentPaid]);

  const handleAcceptPayment = async () => {
    const formValues = getValues();

    if (!formValues.client.id) {
      toast.error('Payment information was not saved. Please try again later');
      throw new Error('Client ID not found');
    }

    const { error, message, payment } = await updatePaymentAndProcessTransaction(
      formValues.payment
    );

    if (!error && payment) {
      const _payment = {
        ...formValues.payment,
        ...payment,
      };
      setValue('payment', _payment);
      toast.success(message || 'Payment processed successfully');
      router.refresh();
    } else {
      toast.error(message || 'Failed to process payment');
      throw new Error(message);
    }
  };

  const formValues = getValues();
  const customerName =
    `${formValues.client?.firstName || ''} ${formValues.client?.lastName || ''}`.trim();
  const amount = formValues.payment?.totalAmount || 0;

  const handlePaymentModeChange = (mode: PaymentMode) => {
    setValue('payment.paymentMode', mode);
  };

  return (
    <SharedPaymentModeSelector
      phoneNumber={formValues.client?.phoneNumber}
      paymentId={formValues.payment.id}
      customerName={customerName}
      amount={amount}
      buttonText={buttonText}
      onAcceptPayment={handleAcceptPayment}
      handlePaymentModeChange={handlePaymentModeChange}
    />
  );
};

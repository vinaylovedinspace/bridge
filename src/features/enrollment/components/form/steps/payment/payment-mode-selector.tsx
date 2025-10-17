import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { AdmissionFormValues } from '@/features/enrollment/types';
import { toast } from 'sonner';
import { PaymentModeSelector as SharedPaymentModeSelector } from '@/components/payment/payment-mode-selector';
import { PaymentMode } from '@/db/schema';
import { useRouter } from 'next/navigation';
import { upsertPaymentWithOptionalTransaction } from '@/server/action/payments';
import { EnrollmentPayment } from './types';

export const PaymentModeSelector = ({ payment }: { payment: EnrollmentPayment }) => {
  const router = useRouter();
  const { getValues, setValue } = useFormContext<AdmissionFormValues>();

  // Check if this is installment payment and if 1st installment is paid
  const isFirstInstallmentPaid = useMemo(() => {
    if (!payment || payment.paymentType !== 'INSTALLMENTS') {
      return false;
    }
    const firstInstallment = payment.installmentPayments?.find(
      (inst) => inst.installmentNumber === 1
    );
    return firstInstallment?.isPaid ?? false;
  }, [payment]);

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

    const { error, message, payment } = await upsertPaymentWithOptionalTransaction({
      payment: formValues.payment,
      processTransaction: true,
    });

    if (!error && payment) {
      const updatedPayment = {
        ...formValues.payment,
        ...payment,
      };

      setValue('payment', updatedPayment);

      toast.success(message, {
        position: 'top-right',
      });

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
      paymentType={formValues.payment.paymentType}
      customerName={customerName}
      amount={amount}
      buttonText={buttonText}
      onAcceptPayment={handleAcceptPayment}
      handlePaymentModeChange={handlePaymentModeChange}
    />
  );
};

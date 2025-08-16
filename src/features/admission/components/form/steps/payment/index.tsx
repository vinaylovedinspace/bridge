import { TypographyH5 } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { PaymentOptions } from './payment-options';
import { PaymentModeSelector } from './payment-mode-selector';
import { PaymentCheckboxProps, PAYMENT_INFO, PaymentInfoState } from './types';
import { useState } from 'react';
import { PaymentOverview as PaymentOverviewComponent } from './payment-overview';

export { PAYMENT_INFO, type PaymentInfoState } from './types';
export { PaymentOverviewComponent as PaymentOverview };

interface PaymentStepProps extends PaymentCheckboxProps {
  existingPayment?: {
    discount: number;
    paymentType?: 'FULL_PAYMENT' | 'INSTALLMENTS' | 'PAY_LATER' | null;
    secondInstallmentDate?: Date | string | null;
    paymentDueDate?: Date | string | null;
  } | null;
  clientId?: string;
  paymentId?: string;
}

export const PaymentStep = ({
  paymentCheckboxes,
  setPaymentCheckboxes,
  existingPayment,
  clientId,
  paymentId,
}: PaymentStepProps) => {
  return (
    <Card className="grid grid-cols-12 col-span-8 align-center px-6 py-10 h-fit">
      <TypographyH5 className="col-span-3">Payment Info</TypographyH5>
      <PaymentOptions
        paymentCheckboxes={paymentCheckboxes}
        setPaymentCheckboxes={setPaymentCheckboxes}
        existingPayment={existingPayment}
      />
      <PaymentModeSelector clientId={clientId} paymentId={paymentId} />
    </Card>
  );
};

// Create a component that renders both PaymentOverview and PaymentStep
export const PaymentContainer = ({
  clientId,
  paymentId,
}: {
  clientId?: string;
  paymentId?: string;
}) => {
  const [paymentCheckboxes, setPaymentCheckboxes] = useState<PaymentInfoState>(PAYMENT_INFO);

  return (
    <div className="grid grid-cols-12 gap-6">
      <PaymentStep
        paymentCheckboxes={paymentCheckboxes}
        setPaymentCheckboxes={setPaymentCheckboxes}
        existingPayment={null}
        clientId={clientId}
        paymentId={paymentId}
      />
      <div className="col-span-4">
        <PaymentOverviewComponent
          discountInfo={paymentCheckboxes.discount}
          paymentCheckboxes={paymentCheckboxes}
        />
      </div>
    </div>
  );
};

import { TypographyH5 } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { PaymentOptions } from './payment-options';
import { PaymentModeSelector } from './payment-mode-selector';
import { PAYMENT_INFO, PaymentInfoState } from './types';
import { Dispatch, SetStateAction, useState } from 'react';
import { PaymentOverview as PaymentOverviewComponent } from './payment-overview';
import { Enrollment } from '@/server/db/plan';

export { PAYMENT_INFO, type PaymentInfoState } from './types';
export { PaymentOverviewComponent as PaymentOverview };

type PaymentStepProps = {
  paymentCheckboxes: PaymentInfoState;
  setPaymentCheckboxes: Dispatch<SetStateAction<PaymentInfoState>>;
  existingPayment: NonNullable<Enrollment>['payment'];
};

export const PaymentStep = ({
  paymentCheckboxes,
  setPaymentCheckboxes,
  existingPayment,
}: PaymentStepProps) => {
  return (
    <Card className="grid grid-cols-12 col-span-8 align-center px-6 py-10 h-fit">
      <TypographyH5 className="col-span-3">Payment Info</TypographyH5>
      <PaymentOptions
        paymentCheckboxes={paymentCheckboxes}
        setPaymentCheckboxes={setPaymentCheckboxes}
        existingPayment={existingPayment}
      />
      <PaymentModeSelector existingPayment={existingPayment} />
    </Card>
  );
};

// Create a component that renders both PaymentOverview and PaymentStep
export const PaymentContainer = () => {
  const [paymentCheckboxes, setPaymentCheckboxes] = useState<PaymentInfoState>(PAYMENT_INFO);

  return (
    <div className="grid grid-cols-12 gap-6">
      <PaymentStep
        paymentCheckboxes={paymentCheckboxes}
        setPaymentCheckboxes={setPaymentCheckboxes}
        existingPayment={null}
      />
      <div className="col-span-4">
        <PaymentOverviewComponent discount={paymentCheckboxes.discount} />
      </div>
    </div>
  );
};

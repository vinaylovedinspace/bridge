import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { FormItem, FormLabel } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import type { PaymentMode } from '@/db/schema/transactions/columns';

type PaymentModeSelectorProps = {
  buttonText?: string;
  onAcceptPayment: () => Promise<void>;
  handlePaymentModeChange: (mode: PaymentMode) => void;
};

const PAYMENT_MODES: PaymentMode[] = ['QR', 'CASH'];

export const PaymentModeSelector = ({
  buttonText = 'Accept Payment',
  onAcceptPayment,
  handlePaymentModeChange,
}: PaymentModeSelectorProps) => {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [isAcceptingPayment, setIsAcceptingPayment] = useState(false);

  const handlePaymentSuccess = async () => {
    setIsAcceptingPayment(true);
    try {
      await onAcceptPayment();
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setIsAcceptingPayment(false);
    }
  };

  return (
    <>
      <Separator className="mb-4 mt-0 col-span-9 col-start-4" />

      <div className="col-span-9 col-start-4">
        <FormItem className="space-y-4">
          <FormLabel>Payment Mode</FormLabel>
          <RadioGroup
            value={paymentMode}
            onValueChange={(value) => {
              const newMode = value as PaymentMode;
              setPaymentMode(newMode);
              handlePaymentModeChange(newMode);
            }}
            className="flex gap-5 items-center"
          >
            {PAYMENT_MODES.map((mode) => (
              <div key={mode} className="flex items-center space-x-2">
                <RadioGroupItem value={mode} id={mode.toLowerCase()} />
                <FormLabel htmlFor={mode.toLowerCase()} className="cursor-pointer font-normal">
                  {mode}
                </FormLabel>
              </div>
            ))}
          </RadioGroup>
        </FormItem>

        <div className="mt-8">
          <Button
            onClick={handlePaymentSuccess}
            type="button"
            className="w-fit"
            disabled={isAcceptingPayment}
            isLoading={isAcceptingPayment}
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </>
  );
};

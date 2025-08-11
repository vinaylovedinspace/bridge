import { useState } from 'react';
import { FormItem, FormLabel } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TypographyMuted } from '@/components/ui/typography';
import { Separator } from '@/components/ui/separator';
import { PaymentModeEnum } from '@/db/schema/transactions/columns';
import { useFormContext } from 'react-hook-form';
import { AdmissionFormValues } from '@/features/admission/types';
import { toast } from 'sonner';

export const PaymentModeSelector = () => {
  const { getValues, setValue } = useFormContext<AdmissionFormValues>();

  // Initialize payment mode from existing form data
  const getInitialPaymentMode = () => {
    const payment = getValues().payment;
    const paymentType = payment?.paymentType || 'FULL_PAYMENT';

    if (paymentType === 'FULL_PAYMENT') {
      return payment?.fullPaymentMode || 'PAYMENT_LINK';
    } else if (paymentType === 'INSTALLMENTS') {
      return payment?.firstPaymentMode || 'PAYMENT_LINK';
    }
    return 'PAYMENT_LINK';
  };

  const [paymentMode, setPaymentMode] =
    useState<(typeof PaymentModeEnum.enumValues)[number]>(getInitialPaymentMode());
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(getValues().personalInfo?.phoneNumber);

  const handleSendPaymentLink = () => {
    toast.success('Payment link sent successfully');
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
              const newMode = value as (typeof PaymentModeEnum.enumValues)[number];
              setPaymentMode(newMode);
              // Update the form value based on payment type
              const paymentType = getValues().payment?.paymentType || 'FULL_PAYMENT';
              if (paymentType === 'FULL_PAYMENT') {
                setValue('payment.fullPaymentMode', newMode);
                // Auto-update payment status for cash payments
                if (newMode === 'CASH') {
                  setValue('payment.paymentStatus', 'FULLY_PAID');
                  setValue('payment.fullPaymentPaid', true);
                } else {
                  setValue('payment.paymentStatus', 'PENDING');
                  setValue('payment.fullPaymentPaid', false);
                }
              } else if (paymentType === 'INSTALLMENTS') {
                setValue('payment.firstPaymentMode', newMode);
                setValue('payment.secondPaymentMode', newMode);
                // Auto-update payment status for cash installments
                if (newMode === 'CASH') {
                  setValue('payment.paymentStatus', 'FULLY_PAID');
                  setValue('payment.firstInstallmentPaid', true);
                  setValue('payment.secondInstallmentPaid', true);
                } else {
                  setValue('payment.paymentStatus', 'PENDING');
                  setValue('payment.firstInstallmentPaid', false);
                  setValue('payment.secondInstallmentPaid', false);
                }
              }
            }}
            className="flex gap-5 items-center"
          >
            {PaymentModeEnum.enumValues.map((mode) => (
              <div key={mode} className="flex items-center space-x-2">
                <RadioGroupItem value={mode} id={mode.toLowerCase()} />
                <FormLabel htmlFor={mode.toLowerCase()} className="cursor-pointer font-normal">
                  {mode.replace('_', ' ')}
                </FormLabel>
              </div>
            ))}
          </RadioGroup>
        </FormItem>

        {paymentMode === 'PAYMENT_LINK' && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-5">
                {isEditingPhone ? (
                  <div className="flex items-center gap-2">
                    <TypographyMuted>Send Payment Link to: </TypographyMuted>
                    <Input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="h-10 w-32"
                      placeholder="Enter phone number"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingPhone(false)}
                      className="h-10"
                      type="button"
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <TypographyMuted>Send Payment Link to: {phoneNumber}</TypographyMuted>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingPhone(true)}
                      className="h-8 px-2"
                      type="button"
                    >
                      Edit
                    </Button>
                  </div>
                )}
                <Button onClick={handleSendPaymentLink} type="button" className="w-fit">
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

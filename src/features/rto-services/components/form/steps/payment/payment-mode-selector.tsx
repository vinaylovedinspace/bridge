import { useState } from 'react';
import { FormItem, FormLabel } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TypographyMuted } from '@/components/ui/typography';
import { Separator } from '@/components/ui/separator';
import { PaymentModeEnum } from '@/db/schema/transactions/columns';
import { useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2, CheckCircle, MessageSquare, Phone } from 'lucide-react';
import { createPaymentLinkAction } from '@/features/enrollment/server/action';
import { useRouter } from 'next/navigation';
import { RTOServiceFormValues } from '@/features/rto-services/types';
import { createPayment } from '@/features/rto-services/server/action';
import { useRTOPaymentCalculations } from '@/features/rto-services/hooks/use-rto-payment-calculations';

export const PaymentModeSelector = () => {
  const { getValues, setValue } = useFormContext<RTOServiceFormValues>();
  const router = useRouter();
  const { totalAmountAfterDiscount } = useRTOPaymentCalculations();

  const [paymentMode, setPaymentMode] =
    useState<(typeof PaymentModeEnum.enumValues)[number]>('PAYMENT_LINK');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(getValues().client?.phoneNumber);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [isAcceptingPayment, setIsAcceptingPayment] = useState(false);

  // RTO services always use FULL_PAYMENT, no installments
  const buttonText = 'Accept Payment';

  const handleAcceptPayment = async () => {
    setIsAcceptingPayment(true);

    try {
      const formValues = getValues();
      const payment = formValues.payment;
      const clientId = formValues.client?.id;
      const rtoServiceId = formValues.service?.id;

      if (!clientId) {
        toast.error('Client ID not found. Please complete the personal information step first.');
        return;
      }

      if (!rtoServiceId) {
        toast.error('RTO Service ID not found. Please complete the service step first.');
        return;
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
        router.refresh();
        router.push('/dashboard');
      } else {
        toast.error(result.message || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Unexpected error occurred while processing payment');
    } finally {
      setIsAcceptingPayment(false);
    }
  };

  const handleSendPaymentLink = async () => {
    if (!phoneNumber) {
      toast.error('Phone number is required to send payment link');
      return;
    }

    setIsSendingLink(true);
    setSmsSent(false);

    try {
      const formValues = getValues();
      const formPlanId = formValues.service?.id;
      const customerName =
        `${formValues.client?.firstName || ''} ${formValues.client?.lastName || ''}`.trim();

      if (!formPlanId) {
        toast.error('Missing plan information. Please complete the Plan step first.');
        return;
      }

      const amount = totalAmountAfterDiscount;

      if (amount <= 0) {
        toast.error('Invalid payment amount');
        return;
      }

      // Use the actual payment link creation
      const result = await createPaymentLinkAction({
        amount,
        customerPhone: phoneNumber,
        customerName: customerName || 'Student',
        planId: formPlanId,
        sendSms: true,
      });

      if (result.success) {
        setSmsSent(true);
        toast.success('Payment link created!', {
          description: `Payment link sent to ${phoneNumber}`,
          duration: 5000,
        });

        // Reset SMS sent status after 45 seconds
        setTimeout(() => setSmsSent(false), 45000);
      } else {
        toast.error('Failed to create payment link', {
          description: result.error || 'Unknown error occurred',
          duration: 6000,
        });
      }
    } catch (error) {
      console.error('Error creating payment link:', error);
      toast.error('Unexpected error occurred', {
        description: 'Please try again or contact support if the issue persists',
        duration: 6000,
      });
    } finally {
      setIsSendingLink(false);
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
              const newMode = value as (typeof PaymentModeEnum.enumValues)[number];
              setPaymentMode(newMode);
              setValue('payment.paymentMode', newMode);
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
                    <Phone className="h-4 w-4 text-muted-foreground" />
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
                <Button
                  onClick={handleSendPaymentLink}
                  type="button"
                  className="w-fit"
                  disabled={isSendingLink || !phoneNumber || smsSent}
                  variant={smsSent ? 'secondary' : 'default'}
                >
                  {isSendingLink ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : smsSent ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Sent
                    </>
                  ) : (
                    <>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {(paymentMode === 'CASH' || paymentMode === 'QR') && (
          <div className="mt-8">
            <Button
              onClick={handleAcceptPayment}
              type="button"
              className="w-fit"
              disabled={isAcceptingPayment}
              isLoading={isAcceptingPayment}
            >
              {buttonText}
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

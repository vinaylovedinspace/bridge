import { useState, useMemo } from 'react';
import { FormItem, FormLabel } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TypographyMuted } from '@/components/ui/typography';
import { Separator } from '@/components/ui/separator';
import { PaymentModeEnum } from '@/db/schema/transactions/columns';
import { useFormContext } from 'react-hook-form';
import { AdmissionFormValues } from '@/features/enrollment/types';
import { toast } from 'sonner';
import { Loader2, CheckCircle, MessageSquare, Phone } from 'lucide-react';
import { createPaymentLinkAction, createPayment } from '@/features/enrollment/server/action';
import { useRouter } from 'next/navigation';
import { Enrollment } from '@/server/db/plan';

type PaymentModeSelectorProps = {
  existingPayment: NonNullable<Enrollment>['payment'];
};

export const PaymentModeSelector = ({ existingPayment }: PaymentModeSelectorProps) => {
  const { getValues, setValue } = useFormContext<AdmissionFormValues>();
  const router = useRouter();

  const [paymentMode, setPaymentMode] =
    useState<(typeof PaymentModeEnum.enumValues)[number]>('PAYMENT_LINK');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(getValues().personalInfo?.phoneNumber);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [isAcceptingPayment, setIsAcceptingPayment] = useState(false);

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
    setIsAcceptingPayment(true);

    try {
      const formValues = getValues();
      const payment = formValues.payment;
      const clientId = formValues.clientId;
      const planId = formValues.planId;

      if (!clientId) {
        toast.error('Client ID not found. Please complete the personal information step first.');
        return;
      }

      if (!planId) {
        toast.error('Plan ID not found. Please complete the plan step first.');
        return;
      }

      const result = await createPayment({
        ...payment,
        clientId,
        planId,
      });

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
      const formPlanId = formValues.planId;
      const customerName =
        `${formValues.personalInfo?.firstName || ''} ${formValues.personalInfo?.lastName || ''}`.trim();

      if (!formPlanId) {
        toast.error('Missing plan information. Please complete the Plan step first.');
        return;
      }

      const payment = formValues.payment;

      // Calculate amount based on payment type
      let amount = 0;

      // TODO: Reimplement amount calculation with new schema
      amount = payment?.finalAmount || 0;

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
                      Sending SMS...
                    </>
                  ) : smsSent ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      SMS Sent
                    </>
                  ) : (
                    <>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Send SMS
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {(paymentMode === 'CASH' || paymentMode === 'QR') && (
          <div className="mt-6">
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

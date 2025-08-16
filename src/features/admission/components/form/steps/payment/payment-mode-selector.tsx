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
import { Loader2, CheckCircle, MessageSquare, Phone } from 'lucide-react';

// Temporary stub for payment link functionality
// TODO: Implement payment link integration
const createPaymentLink = async (data: {
  clientId: string;
  paymentId: string;
  phoneNumber: string;
  amount: number;
  installmentNumber?: number;
}) => {
  console.log('Payment link data:', data);
  return {
    error: true,
    message:
      'Payment link functionality is currently unavailable. Please use Cash or Bank Transfer.',
  };
};

interface PaymentModeSelectorProps {
  clientId?: string;
  paymentId?: string;
}

export const PaymentModeSelector = ({ clientId, paymentId }: PaymentModeSelectorProps) => {
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
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  const handleSendPaymentLink = async () => {
    if (!phoneNumber) {
      toast.error('Phone number is required to send payment link');
      return;
    }

    setIsSendingLink(true);
    setSmsSent(false);

    try {
      const formValues = getValues();
      const formClientId = formValues.clientId || clientId;
      const formPaymentId = formValues.paymentId || paymentId;

      if (!formClientId || !formPaymentId) {
        toast.error('Missing client or payment information. Please save the form first.');
        return;
      }

      const payment = formValues.payment;

      // Calculate amount and installment number based on payment type
      let amount = 0;
      let installmentNumber: number | undefined;

      if (payment?.paymentType === 'FULL_PAYMENT') {
        amount = payment.finalAmount || 0;
      } else if (payment?.paymentType === 'INSTALLMENTS') {
        amount = payment.firstInstallmentAmount || 0;
        installmentNumber = 1;
      }

      if (amount <= 0) {
        toast.error('Invalid payment amount');
        return;
      }

      // Use secure server action
      const result = await createPaymentLink({
        clientId: formClientId,
        paymentId: formPaymentId,
        phoneNumber,
        amount,
        installmentNumber,
      });

      if (!result.error) {
        setSmsSent(true);
        toast.success('Processing payment link!', {
          description: `SMS will be sent to ${phoneNumber} shortly`,
          duration: 5000,
        });

        // Reset SMS sent status after 45 seconds (longer for workflow processing)
        setTimeout(() => setSmsSent(false), 45000);
      } else {
        toast.error('Failed to create payment link', {
          description: result.message,
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

            {smsSent && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  <TypographyMuted className="text-blue-800 font-medium">
                    Payment Link Processing
                  </TypographyMuted>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <TypographyMuted className="text-sm text-blue-700">
                      Creating payment link for {phoneNumber}
                    </TypographyMuted>
                  </div>
                  <TypographyMuted className="text-xs text-blue-700">
                    Payment link will be sent via SMS shortly. The link will be valid for 7 days.
                  </TypographyMuted>
                  <TypographyMuted className="text-xs text-blue-700">
                    This process is handled automatically in the background.
                  </TypographyMuted>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

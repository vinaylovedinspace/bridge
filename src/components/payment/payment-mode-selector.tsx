import { useState, useEffect, useRef } from 'react';
import { FormItem, FormLabel } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TypographyMuted } from '@/components/ui/typography';
import { Separator } from '@/components/ui/separator';
import { PaymentMode, PaymentModeEnum } from '@/db/schema/transactions/columns';
import { toast } from 'sonner';
import { CheckCircle, MessageSquare, Phone, QrCode } from 'lucide-react';
import { createPaymentLinkAction } from '@/server/action/payments';
import { QRModal } from './qr-modal';

// Constants
const SMS_SENT_RESET_TIMEOUT = 30; // 30 seconds

// Phone number validation
const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.trim());
};

type PaymentModeSelectorProps = {
  phoneNumber: string;
  customerName: string;
  paymentId?: string;
  paymentType: 'FULL_PAYMENT' | 'INSTALLMENTS';
  amount: number;
  buttonText?: string;
  onAcceptPayment: () => Promise<void>;
  handlePaymentModeChange: (mode: PaymentMode) => void;
};

export const PaymentModeSelector = ({
  phoneNumber: initialPhoneNumber,
  customerName,
  amount,
  buttonText = 'Accept Payment',
  onAcceptPayment,
  paymentId,
  paymentType,
  handlePaymentModeChange,
}: PaymentModeSelectorProps) => {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('PAYMENT_LINK');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [isAcceptingPayment, setIsAcceptingPayment] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [expiryTime, setExpiryTime] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const handleAcceptPayment = async () => {
    setIsAcceptingPayment(true);
    try {
      await onAcceptPayment();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Unexpected error occurred while processing payment');
    } finally {
      setIsAcceptingPayment(false);
    }
  };

  const handleSavePhoneNumber = () => {
    const trimmedPhone = phoneNumber.trim();

    if (!trimmedPhone) {
      toast.error('Phone number is required');
      return;
    }

    if (!isValidPhoneNumber(trimmedPhone)) {
      toast.error('Invalid phone number format. Must be 10 digits starting with 6-9');
      return;
    }

    setPhoneNumber(trimmedPhone);
    setIsEditingPhone(false);
  };

  const handleSendPaymentLink = async () => {
    const trimmedPhone = phoneNumber.trim();

    // Validation checks
    if (!trimmedPhone) {
      toast.error('Phone number is required to send payment link');
      return;
    }

    if (!isValidPhoneNumber(trimmedPhone)) {
      toast.error('Invalid phone number format. Must be 10 digits starting with 6-9');
      return;
    }

    setIsSendingLink(true);
    setSmsSent(false);

    // Clear any existing interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    try {
      if (!paymentId) {
        toast.error('Payment ID is required to send payment link');
        return;
      }

      const result = await createPaymentLinkAction({
        amount,
        customerPhone: trimmedPhone,
        customerName: customerName || 'Student',
        sendSms: true,
        paymentId,
        paymentType,
        type: 'enrollment',
        sendEmail: false,
        enablePartialPayments: false,
      });

      if (result.success) {
        setSmsSent(true);
        setCountdown(SMS_SENT_RESET_TIMEOUT);
        // setQrCode(result.data?.qrCode || null);
        // setExpiryTime(result.data?.expiryTime || null);

        toast.success('Payment link created!', {
          description: `Payment link sent to ${trimmedPhone}`,
          duration: 5000,
        });

        // Start countdown interval
        countdownIntervalRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
              }
              setSmsSent(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error('Payment link not available', {
          description: 'Payment link feature is currently not implemented',
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

  const isPhoneValid = isValidPhoneNumber(phoneNumber);

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
                      aria-label="Phone number"
                      maxLength={10}
                    />
                    <Button
                      variant="outline"
                      onClick={handleSavePhoneNumber}
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
                      aria-label="Edit phone number"
                    >
                      Edit
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleSendPaymentLink}
                    type="button"
                    disabled={isSendingLink || !isPhoneValid || smsSent}
                    variant={smsSent ? 'secondary' : 'default'}
                    isLoading={isSendingLink}
                  >
                    {smsSent ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Sent {countdown > 0 && `(${countdown}s)`}
                      </>
                    ) : (
                      <>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Send Link
                      </>
                    )}
                  </Button>

                  {qrCode && (
                    <Button variant="outline" onClick={() => setShowQrModal(true)} type="button">
                      <QrCode className="mr-2 h-4 w-4" />
                      Show QR
                    </Button>
                  )}
                </div>
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

      <QRModal
        showQrModal={showQrModal}
        setShowQrModal={setShowQrModal}
        qrCode={qrCode}
        expiryTime={expiryTime}
      />
    </>
  );
};

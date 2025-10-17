import { useState, useEffect, useRef } from 'react';
import { FormItem, FormLabel } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TypographyMuted } from '@/components/ui/typography';
import { Separator } from '@/components/ui/separator';
import { PaymentMode, PaymentModeEnum } from '@/db/schema/transactions/columns';
import { toast } from 'sonner';
import { CheckCircle, MessageSquare, Phone, Loader2, QrCode } from 'lucide-react';
import {
  createPaymentLinkAction,
  checkPaymentLinkStatusAction,
  createSetuPaymentLinkAction,
} from '@/server/action/payments';
import { QRModal } from './qr-modal';

// Constants
const SMS_SENT_RESET_TIMEOUT = 30; // 30 seconds
const PAYMENT_POLL_INTERVAL = 5000; // 5 seconds
const PAYMENT_POLL_MAX_ATTEMPTS = 120; // 10 minutes max (120 * 5s = 600s)

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
  const [isPollingPayment, setIsPollingPayment] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [expiryTime, setExpiryTime] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptRef = useRef(0);
  const paymentLinkReferenceIdRef = useRef<string | null>(null);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
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

  // Start polling for payment status
  const startPaymentPolling = (referenceId: string) => {
    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    paymentLinkReferenceIdRef.current = referenceId;
    setIsPollingPayment(true);
    pollAttemptRef.current = 0;

    // Initial check
    checkPaymentLinkStatus();

    // Set up interval
    pollIntervalRef.current = setInterval(() => {
      checkPaymentLinkStatus();
    }, PAYMENT_POLL_INTERVAL);
  };

  // Stop polling
  const stopPaymentPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPollingPayment(false);
    setQrCode(null);
    pollAttemptRef.current = 0;
  };

  // Check payment link status via transaction
  const checkPaymentLinkStatus = async () => {
    const referenceId = paymentLinkReferenceIdRef.current;
    if (!referenceId) return;

    pollAttemptRef.current += 1;

    // Stop polling after max attempts
    if (pollAttemptRef.current > PAYMENT_POLL_MAX_ATTEMPTS) {
      stopPaymentPolling();
      toast.info('Payment link has expired', {
        description: 'Please send a new payment link if needed',
      });
      return;
    }

    try {
      const result = await checkPaymentLinkStatusAction(referenceId);

      if (!result.success || !result.isPaid) {
        return; // No payment detected yet, continue polling
      }

      // Payment link was paid successfully!
      stopPaymentPolling();

      toast.success('Payment received successfully! 🎉', {
        description: 'Completing enrollment...',
        duration: 5000,
      });

      // Wait a moment for user to see the toast, then complete the flow
      setTimeout(async () => {
        try {
          await handleAcceptPayment();
        } catch (error) {
          console.error('Error completing enrollment:', error);
        }
      }, 1500);
    } catch (error) {
      console.error('Error checking payment link status:', error);
    }
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

      // Use Razorpay for PAYMENT_LINK mode
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

      if (result.success && result.referenceId) {
        setSmsSent(true);
        setCountdown(SMS_SENT_RESET_TIMEOUT);

        toast.success('Payment link sent!', {
          description: `Payment link sent to ${trimmedPhone} via SMS. Waiting for payment...`,
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

        // Start polling for payment status using the reference ID
        startPaymentPolling(result.referenceId);
      } else {
        toast.error('Failed to create payment link', {
          description: 'Please try again or contact support',
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

  const handleSendUpiLink = async () => {
    const trimmedPhone = phoneNumber.trim();

    // Validation checks
    if (!trimmedPhone) {
      toast.error('Phone number is required to send UPI link');
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
        toast.error('Payment ID is required to send UPI link');
        return;
      }

      const result = await createSetuPaymentLinkAction({
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

      if (result.success && result.data) {
        setSmsSent(true);
        setCountdown(SMS_SENT_RESET_TIMEOUT);
        // Ensure QR code has proper data URI format
        const qrCodeData = result.data.qrCode;
        const formattedQrCode = qrCodeData?.startsWith('data:')
          ? qrCodeData
          : `data:image/png;base64,${qrCodeData}`;
        setQrCode(formattedQrCode || null);
        setExpiryTime(result.data.expiryDate || null);

        // TODO: Send WhatsApp message with result.data.shortLink
        console.log('Send this via WhatsApp:', result.data.shortLink);

        toast.success('UPI payment link created!', {
          description: `Link will be sent via WhatsApp to ${trimmedPhone}. QR code is available.`,
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

        // Start polling for payment status using the payment ID (reference ID)
        startPaymentPolling(paymentId);
      } else {
        toast.error('Failed to create UPI link', {
          description: 'Please try again or contact support',
          duration: 6000,
        });
      }
    } catch (error) {
      console.error('Error creating UPI link:', error);
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

        {(paymentMode === 'PAYMENT_LINK' || paymentMode === 'UPI') && (
          <div className="mt-6 space-y-4">
            {/* Phone Number Section */}
            {isEditingPhone ? (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <TypographyMuted>
                  Send {paymentMode === 'UPI' ? 'UPI' : 'Payment'} Link to:{' '}
                </TypographyMuted>
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
                <TypographyMuted>
                  Send {paymentMode === 'UPI' ? 'UPI' : 'Payment'} Link to: {phoneNumber}
                </TypographyMuted>
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

            {/* Actions Section */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={paymentMode === 'UPI' ? handleSendUpiLink : handleSendPaymentLink}
                type="button"
                disabled={isSendingLink || !isPhoneValid || smsSent || isPollingPayment}
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
                    Send {paymentMode === 'UPI' ? 'via WhatsApp' : 'via SMS'}
                  </>
                )}
              </Button>

              {paymentMode === 'UPI' && qrCode && (
                <Button variant="outline" onClick={() => setShowQrModal(true)} type="button">
                  <QrCode className="mr-2 h-4 w-4" />
                  Show QR Code
                </Button>
              )}
            </div>

            {/* Polling Status */}
            {isPollingPayment && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Waiting for payment...</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stopPaymentPolling}
                  type="button"
                  className="ml-auto h-8"
                >
                  Stop Waiting
                </Button>
              </div>
            )}
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

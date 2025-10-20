import { useState } from 'react';
import { FormItem, FormLabel } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PaymentMode, PaymentModeEnum } from '@/db/schema/transactions/columns';
import { toast } from 'sonner';
import { QrCode } from 'lucide-react';
import { QRModal } from './qr-modal';
import { usePhoneNumber } from './hooks/use-phone-number';
import { usePaymentPolling } from './hooks/use-payment-polling';
import { useSendLinkCountdown } from './hooks/use-send-link-countdown';
import { usePaymentLinkSender } from './hooks/use-payment-link-sender';
import { PhoneNumberEditor } from './components/phone-number-editor';
import { SendLinkButton } from './components/send-link-button';
import { PollingStatus } from './components/polling-status';
import { useRouter } from 'next/navigation';

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

const PAYMENT_MODES = PaymentModeEnum.enumValues.filter((mode) => mode !== 'UPI');

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
  const [isAcceptingPayment, setIsAcceptingPayment] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const router = useRouter();
  const phone = usePhoneNumber(initialPhoneNumber);
  const { smsSent, countdown, startCountdown } = useSendLinkCountdown();
  const { isSending, qrCode, expiryTime, sendRazorpayLink, sendSetuLink } = usePaymentLinkSender();

  const handlePaymentSuccess = async () => {
    try {
      await onAcceptPayment();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Unexpected error occurred while processing payment');
    } finally {
      setIsAcceptingPayment(false);
    }
  };

  const handlePaymentLinkSuccess = async () => {
    router.refresh();
    router.back();
  };

  const polling = usePaymentPolling({ onPaymentSuccess: handlePaymentLinkSuccess });

  const handleSendPaymentLink = async () => {
    if (!paymentId) {
      toast.error('Payment ID is required to send payment link');
      return;
    }

    const result = await sendRazorpayLink({
      amount,
      customerPhone: phone.phoneNumber,
      customerName: customerName || 'Student',
      paymentId,
      paymentType,
    });

    if (result.success && result.referenceId) {
      startCountdown();
      polling.start(result.referenceId);
    }
  };

  const handleSendUpiLink = async () => {
    if (!phone.isValid) {
      toast.error('Please enter a valid phone number');
      return;
    }

    if (!paymentId) {
      toast.error('Payment ID is required to send UPI link');
      return;
    }

    const result = await sendSetuLink({
      amount,
      customerPhone: phone.phoneNumber,
      customerName: customerName || 'Student',
      paymentId,
      paymentType,
    });

    if (result.success && result.referenceId) {
      startCountdown();
      polling.start(result.referenceId);
    }
  };

  const isOnlinePaymentMode = paymentMode === 'PAYMENT_LINK' || paymentMode === 'UPI';
  const isOfflinePaymentMode = paymentMode === 'CASH' || paymentMode === 'QR';

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
                  {mode.replace('_', ' ')}
                </FormLabel>
              </div>
            ))}
          </RadioGroup>
        </FormItem>

        {isOnlinePaymentMode && (
          <div className="mt-6 space-y-4">
            <PhoneNumberEditor
              phoneNumber={phone.phoneNumber}
              isEditing={phone.isEditing}
              paymentMode={paymentMode}
              onPhoneChange={phone.setPhoneNumber}
              onSave={phone.savePhoneNumber}
              onEdit={() => phone.setIsEditing(true)}
            />

            <div className="flex items-center gap-3 flex-wrap">
              <SendLinkButton
                paymentMode={paymentMode}
                isSending={isSending}
                smsSent={smsSent}
                countdown={countdown}
                isPhoneValid={phone.isValid}
                isPolling={polling.isPolling}
                onClick={paymentMode === 'UPI' ? handleSendUpiLink : handleSendPaymentLink}
              />

              {paymentMode === 'UPI' && qrCode && (
                <Button variant="outline" onClick={() => setShowQrModal(true)} type="button">
                  <QrCode className="mr-2 h-4 w-4" />
                  Show QR Code
                </Button>
              )}
            </div>

            <PollingStatus isPolling={polling.isPolling} onStop={polling.stop} />
          </div>
        )}

        {isOfflinePaymentMode && (
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

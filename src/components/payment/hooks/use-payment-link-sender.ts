import { useState } from 'react';
import { toast } from 'sonner';
import { createPhonePePaymentLinkAction } from '@/server/action/payments';

type PaymentLinkParams = {
  amount: number;
  customerPhone: string;
  customerName: string;
  paymentId: string;
  paymentType: 'FULL_PAYMENT' | 'INSTALLMENTS';
};

export const usePaymentLinkSender = () => {
  const [isSending, setIsSending] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [expiryTime, setExpiryTime] = useState<string | null>(null);

  const sendPhonePeLink = async (params: PaymentLinkParams) => {
    setIsSending(true);
    try {
      const result = await createPhonePePaymentLinkAction({
        ...params,
        type: 'enrollment',
        sendEmail: false,
        enablePartialPayments: false,
      });

      if (result.success && result.data) {
        setQrCode(null); // PhonePe doesn't provide QR code in payment link
        setExpiryTime(null); // PhonePe doesn't provide explicit expiry

        // TODO: Send WhatsApp message with result.data.paymentUrl
        console.log('Send this via WhatsApp:', result.data.paymentUrl);

        toast.success('UPI payment link created!', {
          description: `Link will be sent via WhatsApp to ${params.customerPhone}.`,
          duration: 5000,
        });

        return { success: true, referenceId: result.data.linkId };
      }

      toast.error('Failed to create UPI link', {
        description: 'Please try again or contact support',
        duration: 6000,
      });
      return { success: false };
    } catch (error) {
      console.error('Error creating UPI link:', error);
      toast.error('Unexpected error occurred', {
        description: 'Please try again or contact support if the issue persists',
        duration: 6000,
      });
      return { success: false };
    } finally {
      setIsSending(false);
    }
  };

  return {
    isSending,
    qrCode,
    expiryTime,
    sendPhonePeLink,
  };
};

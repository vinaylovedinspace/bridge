import { useState } from 'react';
import { toast } from 'sonner';
import { createPaymentLinkAction, createSetuPaymentLinkAction } from '@/server/action/payments';

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

  const sendRazorpayLink = async (params: PaymentLinkParams) => {
    setIsSending(true);
    try {
      const result = await createPaymentLinkAction({
        ...params,
        sendSms: true,
        type: 'enrollment',
        sendEmail: false,
        enablePartialPayments: false,
      });

      if (result.success && result.referenceId) {
        toast.success('Payment link sent!', {
          description: `Payment link sent to ${params.customerPhone} via SMS. Waiting for payment...`,
          duration: 5000,
        });
        return { success: true, referenceId: result.referenceId };
      }

      toast.error('Failed to create payment link', {
        description: 'Please try again or contact support',
        duration: 6000,
      });
      return { success: false };
    } catch (error) {
      console.error('Error creating payment link:', error);
      toast.error('Unexpected error occurred', {
        description: 'Please try again or contact support if the issue persists',
        duration: 6000,
      });
      return { success: false };
    } finally {
      setIsSending(false);
    }
  };

  const sendSetuLink = async (params: PaymentLinkParams) => {
    setIsSending(true);
    try {
      const result = await createSetuPaymentLinkAction({
        ...params,
        sendSms: true,
        type: 'enrollment',
        sendEmail: false,
        enablePartialPayments: false,
      });

      if (result.success && result.data) {
        const qrCodeData = result.data.qrCode;
        const formattedQrCode = qrCodeData?.startsWith('data:')
          ? qrCodeData
          : `data:image/png;base64,${qrCodeData}`;

        setQrCode(formattedQrCode || null);
        setExpiryTime(result.data.expiryDate || null);

        // TODO: Send WhatsApp message with result.data.shortLink
        console.log('Send this via WhatsApp:', result.data.shortLink);

        toast.success('UPI payment link created!', {
          description: `Link will be sent via WhatsApp to ${params.customerPhone}. QR code is available.`,
          duration: 5000,
        });

        return { success: true, referenceId: params.paymentId };
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
    sendRazorpayLink,
    sendSetuLink,
  };
};

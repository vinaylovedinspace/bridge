import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { checkPhonePePaymentStatusAction } from '@/server/action/payments';

const PAYMENT_POLL_INTERVAL = 30000; // 30 seconds (reduced from 5s - webhook is primary)
const PAYMENT_POLL_MAX_ATTEMPTS = 20; // 10 minutes max (30s * 20 = 600s = 10min)

type PaymentPollingProps = {
  onPaymentSuccess: () => Promise<void>;
};

export const usePaymentPolling = ({ onPaymentSuccess }: PaymentPollingProps) => {
  const [isPolling, setIsPolling] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptRef = useRef(0);
  const referenceIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const checkPaymentStatus = async () => {
    const merchantTransactionId = referenceIdRef.current;
    if (!merchantTransactionId) return;

    pollAttemptRef.current += 1;

    if (pollAttemptRef.current > PAYMENT_POLL_MAX_ATTEMPTS) {
      stop();
      toast.info('Payment link has expired', {
        description: 'Please send a new payment link if needed',
      });
      return;
    }

    try {
      const result = await checkPhonePePaymentStatusAction(merchantTransactionId);

      // Check if payment is successful (PhonePe state should be 'COMPLETED')
      if (result.success && result.data && result.data.state === 'COMPLETED') {
        stop();
        toast.success('Payment received successfully! 🎉', {
          description: 'Completing enrollment...',
          duration: 5000,
        });

        setTimeout(async () => {
          try {
            await onPaymentSuccess();
          } catch (error) {
            console.error('Error completing enrollment:', error);
          }
        }, 1500);
      }
    } catch (error) {
      console.error('Error checking payment link status:', error);
    }
  };

  const start = (merchantTransactionId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    referenceIdRef.current = merchantTransactionId;
    setIsPolling(true);
    pollAttemptRef.current = 0;

    checkPaymentStatus();
    pollIntervalRef.current = setInterval(checkPaymentStatus, PAYMENT_POLL_INTERVAL);
  };

  const stop = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
    pollAttemptRef.current = 0;
  };

  return { isPolling, start, stop };
};

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { checkSetuPaymentLinkStatusAction } from '@/server/action/payments';

const PAYMENT_POLL_INTERVAL = 5000; // 5 seconds
const PAYMENT_POLL_MAX_ATTEMPTS = 120; // 10 minutes max

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
    const referenceId = referenceIdRef.current;
    if (!referenceId) return;

    pollAttemptRef.current += 1;

    if (pollAttemptRef.current > PAYMENT_POLL_MAX_ATTEMPTS) {
      stop();
      toast.info('Payment link has expired', {
        description: 'Please send a new payment link if needed',
      });
      return;
    }

    try {
      const result = await checkSetuPaymentLinkStatusAction(referenceId);

      // Check if payment is successful (Setu status should be 'PAID' or similar)
      if (result.success && result.data && result.data.status === 'PAID') {
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

  const start = (referenceId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    referenceIdRef.current = referenceId;
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

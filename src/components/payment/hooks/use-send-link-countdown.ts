import { useState, useRef, useEffect } from 'react';

const SMS_SENT_RESET_TIMEOUT = 30; // 30 seconds

export const useSendLinkCountdown = () => {
  const [smsSent, setSmsSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const startCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    setSmsSent(true);
    setCountdown(SMS_SENT_RESET_TIMEOUT);

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
  };

  return { smsSent, countdown, startCountdown };
};

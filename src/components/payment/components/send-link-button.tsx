import { CheckCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SendLinkButtonProps = {
  paymentMode: 'PAYMENT_LINK' | 'UPI';
  isSending: boolean;
  smsSent: boolean;
  countdown: number;
  isPhoneValid: boolean;
  isPolling: boolean;
  onClick: () => void;
};

export const SendLinkButton = ({
  isSending,
  smsSent,
  countdown,
  isPhoneValid,
  isPolling,
  onClick,
}: SendLinkButtonProps) => {
  return (
    <Button
      onClick={onClick}
      type="button"
      disabled={isSending || !isPhoneValid || smsSent || isPolling}
      variant={smsSent ? 'secondary' : 'default'}
      isLoading={isSending}
    >
      {smsSent ? (
        <>
          <CheckCircle className="mr-2 h-4 w-4" />
          Sent {countdown > 0 && `(${countdown}s)`}
        </>
      ) : (
        <>
          <MessageSquare className="mr-2 h-4 w-4" />
          Send Payment Link
        </>
      )}
    </Button>
  );
};

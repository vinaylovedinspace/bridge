import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PollingStatusProps = {
  isPolling: boolean;
  onStop: () => void;
};

export const PollingStatus = ({ isPolling, onStop }: PollingStatusProps) => {
  if (!isPolling) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Waiting for payment...</span>
      <Button variant="ghost" size="sm" onClick={onStop} type="button" className="ml-auto h-8">
        Stop Waiting
      </Button>
    </div>
  );
};

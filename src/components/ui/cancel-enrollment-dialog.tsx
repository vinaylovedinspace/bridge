'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type CancelEnrollmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  onSaveAndExit: () => void;
  isLoading?: boolean;
};

export function CancelEnrollmentDialog({
  open,
  onOpenChange,
  onDiscard,
  onSaveAndExit,
  isLoading = false,
}: CancelEnrollmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Leave this form?</DialogTitle>
          <DialogDescription>
            You can save your progress and continue later, or discard all changes made so far.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-3 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onDiscard}
            disabled={isLoading}
            className="min-w-24"
          >
            Discard
          </Button>
          <Button
            type="button"
            onClick={onSaveAndExit}
            disabled={isLoading}
            isLoading={isLoading}
            className="min-w-32"
          >
            Save & Exit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

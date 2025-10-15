'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import { CancelEnrollmentDialog } from './cancel-enrollment-dialog';

type FormNavigationProps = {
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  disableNext?: boolean;
  nextButtonText?: string;
  className?: string;

  // functions
  onPrevious: () => void;
  onNext: () => void;
  onCancel: () => void;
  onDiscard?: () => Promise<void>;
  onSaveAndExit?: () => Promise<void>;
};

export function FormNavigation({
  isFirstStep,
  isLastStep,
  isSubmitting,
  disableNext = false,
  nextButtonText,
  onPrevious,
  onNext,
  onCancel,
  onDiscard,
  onSaveAndExit,
  className = '',
}: FormNavigationProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isDialogLoading, setIsDialogLoading] = useState(false);

  const computedNextText = useMemo(() => {
    if (nextButtonText) return nextButtonText;
    if (isSubmitting) return 'Saving...';
    if (isLastStep) return 'Done';
    return 'Save & Continue';
  }, [nextButtonText, isSubmitting, isLastStep]);

  const previousDisabled = isFirstStep || isSubmitting;
  const nextDisabled = isSubmitting || disableNext;

  const handleCancelClick = () => {
    if (onDiscard || onSaveAndExit) {
      setShowCancelDialog(true);
    } else {
      onCancel();
    }
  };

  const handleDiscard = async () => {
    setIsDialogLoading(true);
    try {
      if (onDiscard) {
        await onDiscard();
      }
      setShowCancelDialog(false);
      onCancel();
    } finally {
      setIsDialogLoading(false);
    }
  };

  const handleSaveAndExit = async () => {
    setIsDialogLoading(true);
    try {
      if (onSaveAndExit) {
        await onSaveAndExit();
      }
      setShowCancelDialog(false);
    } finally {
      setIsDialogLoading(false);
    }
  };

  return (
    <>
      <div className={`flex items-center justify-between border-t pt-6 ${className}`}>
        <Button
          type="button"
          variant="outline"
          onClick={handleCancelClick}
          aria-label="Discard changes for this step"
        >
          Cancel
        </Button>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            disabled={previousDisabled}
            aria-label="Go to previous step"
            aria-disabled={previousDisabled}
            className={cn('', {
              invisible: isFirstStep,
            })}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>

          <Button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            isLoading={isSubmitting}
            aria-label={computedNextText}
            aria-disabled={nextDisabled}
            data-state={isLastStep ? 'final' : 'in-progress'}
          >
            {computedNextText}
          </Button>
        </div>
      </div>

      <CancelEnrollmentDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onDiscard={handleDiscard}
        onSaveAndExit={handleSaveAndExit}
        isLoading={isDialogLoading}
      />
    </>
  );
}

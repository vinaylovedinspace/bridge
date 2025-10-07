'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';

type FormNavigationProps = {
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  hasCurrentStepChanges: boolean;
  disableNext?: boolean;
  nextButtonText?: string;
  showDiscardChangesButton?: boolean;
  className?: string;

  // functions
  onPrevious: () => void;
  onNext: () => void;
  onDiscardChanges?: () => void;
};

export function FormNavigation({
  isFirstStep,
  isLastStep,
  isSubmitting,
  hasCurrentStepChanges,
  disableNext = false,
  nextButtonText,
  onPrevious,
  onNext,
  onDiscardChanges,
  showDiscardChangesButton = true,
  className = '',
}: FormNavigationProps) {
  const computedNextText = useMemo(() => {
    if (nextButtonText) return nextButtonText;
    if (isSubmitting) return 'Saving...';
    if (isLastStep) return 'Done';
    return 'Save & Next';
  }, [nextButtonText, isSubmitting, isLastStep]);

  const previousDisabled = isFirstStep || isSubmitting;
  const discardVisible = showDiscardChangesButton && !isLastStep;
  const discardDisabled = isSubmitting || !hasCurrentStepChanges;
  const nextDisabled = isSubmitting || disableNext;

  return (
    <div className={`flex items-center justify-between border-t pt-6 ${className}`}>
      <Button
        type="button"
        variant="outline"
        onClick={onPrevious}
        disabled={previousDisabled}
        aria-label="Go to previous step"
        aria-disabled={previousDisabled}
      >
        Previous
      </Button>

      <div className="flex gap-3">
        {discardVisible && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onDiscardChanges?.()}
            disabled={discardDisabled}
            aria-label="Discard changes for this step"
            aria-disabled={discardDisabled}
          >
            Discard Changes
          </Button>
        )}

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
  );
}

'use client';

import { Button } from '@/components/ui/button';

type FormNavigationProps = {
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  hasCurrentStepChanges: boolean;
  shouldDisableNext?: boolean;
  nextButtonText?: string;
  onPrevious: () => void;
  onNext: () => void;
  onDiscardChanges: () => void;
};

export const FormNavigation = ({
  isFirstStep,
  isLastStep,
  isSubmitting,
  hasCurrentStepChanges,
  shouldDisableNext = false,
  nextButtonText,
  onPrevious,
  onNext,
  onDiscardChanges,
}: FormNavigationProps) => {
  const getNextButtonText = () => {
    if (nextButtonText) return nextButtonText;
    if (isSubmitting) return 'Saving...';
    if (isLastStep) return 'Done';
    return 'Save & Next';
  };

  return (
    <div className="flex justify-between items-center pt-4 border-t">
      <Button
        type="button"
        variant="outline"
        onClick={onPrevious}
        disabled={isFirstStep || isSubmitting}
      >
        Previous
      </Button>

      <div className="flex gap-3">
        {!isLastStep && (
          <Button
            type="button"
            variant="outline"
            onClick={onDiscardChanges}
            disabled={isSubmitting || !hasCurrentStepChanges}
          >
            Discard Changes
          </Button>
        )}

        <Button
          type="button"
          onClick={onNext}
          disabled={isSubmitting || shouldDisableNext}
          isLoading={isSubmitting}
        >
          {getNextButtonText()}
        </Button>
      </div>
    </div>
  );
};

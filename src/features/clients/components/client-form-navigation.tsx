'use client';

import { Button } from '@/components/ui/button';

type ClientFormNavigationProps = {
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  shouldDisablePaymentEdit: boolean;
  hasCurrentStepChanges: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onDiscardChanges: () => void;
};

export const ClientFormNavigation = ({
  isFirstStep,
  isLastStep,
  isSubmitting,
  shouldDisablePaymentEdit,
  hasCurrentStepChanges,
  onPrevious,
  onNext,
  onDiscardChanges,
}: ClientFormNavigationProps) => {
  return (
    <div className="bg-white py-4 px-6 border-t flex justify-between">
      <Button
        type="button"
        variant="outline"
        onClick={onPrevious}
        disabled={isFirstStep || isSubmitting}
      >
        Previous
      </Button>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onDiscardChanges}
          disabled={isSubmitting || !hasCurrentStepChanges}
        >
          Discard Changes
        </Button>

        <Button
          type="button"
          onClick={onNext}
          disabled={isSubmitting || shouldDisablePaymentEdit}
          isLoading={isSubmitting}
        >
          {shouldDisablePaymentEdit ? 'Payment Processed' : isLastStep ? 'Save Changes' : 'Next'}
        </Button>
      </div>
    </div>
  );
};

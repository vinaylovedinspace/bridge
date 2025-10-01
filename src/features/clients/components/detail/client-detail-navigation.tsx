'use client';

import { Button } from '@/components/ui/button';

type ClientDetailNavigationProps = {
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export const ClientDetailNavigation = ({
  isFirstStep,
  isLastStep,
  isSubmitting,
  onPrevious,
  onNext,
}: ClientDetailNavigationProps) => {
  return (
    <div className="flex justify-between items-center pt-4 border-t">
      <Button type="button" variant="outline" onClick={onPrevious} disabled={isFirstStep}>
        Previous
      </Button>

      <Button type="button" onClick={onNext} disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : isLastStep ? 'Done' : 'Next'}
      </Button>
    </div>
  );
};

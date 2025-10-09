'use client';

import { ProgressBar, useStepNavigation, type StepConfig } from '@/components/ui/progress-bar';

export type RTOServiceStepKey = 'personal' | 'license' | 'payment';

const RTO_SERVICE_STEPS: StepConfig<RTOServiceStepKey>[] = [
  { key: 'personal', label: 'Personal Info' },
  { key: 'license', label: 'Licence' },
  { key: 'payment', label: 'Payment' },
];

const FIRST_STEP: RTOServiceStepKey = 'personal';

export const useRTOServiceStepNavigation = () => {
  return useStepNavigation({
    steps: RTO_SERVICE_STEPS,
    firstStep: FIRST_STEP,
  });
};

type RTOServiceProgressBarProps = {
  currentStep: RTOServiceStepKey;
  onStepChange: (stepKey: RTOServiceStepKey) => void;
  interactive?: boolean;
};

export const RTOServiceProgressBar = ({
  currentStep,
  onStepChange,
  interactive = false,
}: RTOServiceProgressBarProps) => {
  return (
    <ProgressBar
      interactive={interactive}
      currentStep={currentStep}
      onStepChange={onStepChange}
      steps={RTO_SERVICE_STEPS}
    />
  );
};

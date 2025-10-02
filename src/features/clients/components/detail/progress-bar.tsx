'use client';

import { ProgressBar, useStepNavigation, type StepConfig } from '@/components/ui/progress-bar';

export type ClientDetailStepKey = 'personal' | 'license' | 'plans';

const CLIENT_DETAIL_STEPS: StepConfig<ClientDetailStepKey>[] = [
  { key: 'personal', label: 'Personal Info' },
  { key: 'license', label: 'Licence' },
  { key: 'plans', label: 'Plans' },
];

const FIRST_STEP: ClientDetailStepKey = 'personal';

export const useClientDetailStepNavigation = () => {
  return useStepNavigation({
    steps: CLIENT_DETAIL_STEPS,
    firstStep: FIRST_STEP,
  });
};

type ClientDetailProgressBarProps = {
  currentStep: ClientDetailStepKey;
  onStepChange: (stepKey: ClientDetailStepKey) => void;
  onStepClick?: (stepKey: ClientDetailStepKey) => Promise<boolean>;
};

export const ClientDetailProgressBar = ({
  currentStep,
  onStepChange,
  onStepClick,
}: ClientDetailProgressBarProps) => {
  return (
    <ProgressBar
      interactive={true}
      currentStep={currentStep}
      onStepChange={onStepChange}
      onStepClick={onStepClick}
      steps={CLIENT_DETAIL_STEPS}
    />
  );
};

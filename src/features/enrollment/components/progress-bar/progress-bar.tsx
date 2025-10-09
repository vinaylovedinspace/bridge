'use client';

import {
  ProgressBar as BaseProgressBar,
  useStepNavigation,
  type StepConfig,
} from '@/components/ui/progress-bar';
import { type AdmissionFormStepKey } from '@/features/enrollment/types';

export type { AdmissionFormStepKey };

// Define admission form steps
export const ADMISSION_STEPS: StepConfig<AdmissionFormStepKey>[] = [
  { key: 'service', label: 'Service Type' },
  { key: 'personal', label: 'Personal Info' },
  { key: 'license', label: 'Licence' },
  { key: 'plan', label: 'Plan' },
  { key: 'payment', label: 'Payment' },
];

const FIRST_STEP: AdmissionFormStepKey = 'service';

export const useAdmissionStepNavigation = () => {
  return useStepNavigation({
    steps: ADMISSION_STEPS,
    firstStep: FIRST_STEP,
  });
};

export type ProgressBarProps = {
  interactive?: boolean;
  onStepClick?: (stepKey: AdmissionFormStepKey) => Promise<boolean> | boolean;
  currentStep: AdmissionFormStepKey;
  onStepChange?: (stepKey: AdmissionFormStepKey) => void;
};

export const ProgressBar = ({
  interactive = true,
  onStepClick,
  currentStep,
  onStepChange,
}: ProgressBarProps) => {
  const handleStepClick = async (stepKey: AdmissionFormStepKey) => {
    if (!interactive) return;

    if (onStepClick) {
      const canNavigate = await onStepClick(stepKey);
      if (canNavigate && onStepChange) {
        onStepChange(stepKey);
      }
    } else if (onStepChange) {
      onStepChange(stepKey);
    }
  };

  return (
    <BaseProgressBar
      currentStep={currentStep}
      onStepChange={handleStepClick}
      steps={ADMISSION_STEPS}
      interactive={interactive}
    />
  );
};

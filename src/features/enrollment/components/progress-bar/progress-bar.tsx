'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQueryState, parseAsStringLiteral } from 'nuqs';
import { ProgressBar as BaseProgressBar, type StepConfig } from '@/components/ui/progress-bar';
import { type AdmissionFormStepKey } from '@/features/enrollment/types';
import { LAST_ENROLLMENT_STEP } from '@/lib/constants/business';

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

export const useCurrentStep = (interactive = true) => {
  const [internalStep, setInternalStep] = useState<AdmissionFormStepKey>(FIRST_STEP);
  const [externalStep, setExternalStep] = useQueryState<AdmissionFormStepKey>(
    'step',
    parseAsStringLiteral(ADMISSION_STEPS.map((step) => step.key))
      .withDefault(FIRST_STEP)
      .withOptions({ shallow: !interactive })
  );

  // For interactive mode, use external step as source of truth
  // For non-interactive mode, use internal step
  const currentStep = interactive ? externalStep : internalStep;
  const setStep = interactive ? setExternalStep : setInternalStep;

  return useMemo(
    () => ({
      currentStep,
      setStep,
      setExternalStep,
    }),
    [currentStep, setStep, setExternalStep]
  );
};

export const useStepNavigation = (interactive = true) => {
  const { currentStep, setStep } = useCurrentStep(interactive);

  const currentIndex = useMemo(() => {
    return ADMISSION_STEPS.findIndex((step) => step.key === currentStep);
  }, [currentStep]);

  const goToStep = useCallback(
    (stepKey: AdmissionFormStepKey) => {
      setStep(stepKey);
    },
    [setStep]
  );

  const goToNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < ADMISSION_STEPS.length) {
      const nextStep = ADMISSION_STEPS[nextIndex].key;
      localStorage.setItem(LAST_ENROLLMENT_STEP, nextStep);
      goToStep(nextStep);
    }
  }, [currentIndex, goToStep]);

  const goToPrevious = useCallback(() => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      const prevStep = ADMISSION_STEPS[prevIndex].key;
      goToStep(prevStep);
    }
  }, [currentIndex, goToStep]);

  return {
    currentStep,
    currentIndex,
    goToStep,
    goToNext,
    goToPrevious,
    isFirstStep: currentIndex === 0,
    isLastStep: currentIndex === ADMISSION_STEPS.length - 1,
  };
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

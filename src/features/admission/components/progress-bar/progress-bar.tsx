'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryState } from 'nuqs';
import { cn } from '@/lib/utils';
import { parseAsStringLiteral } from 'nuqs';
import { Chevron } from './chevron';

export type StepConfig<T extends string = string> = {
  key: T;
  label: string;
};

export type AdmissionFormStepKey = 'service' | 'personal' | 'license' | 'plan' | 'payment';
// Define admission form steps
export const ADMISSION_STEPS: StepConfig<AdmissionFormStepKey>[] = [
  { key: 'service', label: 'Service Type' },
  { key: 'personal', label: 'Personal Info' },
  { key: 'license', label: 'License' },
  { key: 'plan', label: 'Plan' },
  { key: 'payment', label: 'Payment' },
];

const FIRST_STEP = 'service';

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

  return {
    currentStep,
    setStep,
    setExternalStep,
  };
};

export const useStepNavigation = (interactive = true) => {
  const { currentStep, setStep } = useCurrentStep(interactive);

  const currentIndex = useMemo(() => {
    return ADMISSION_STEPS.findIndex((step) => step.key === currentStep);
  }, [currentStep]);

  const goToStep = useCallback(
    (stepKey: AdmissionFormStepKey) => {
      console.log('goToStep', stepKey);
      setStep(stepKey);
    },
    [setStep]
  );

  const goToNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < ADMISSION_STEPS.length) {
      const nextStep = ADMISSION_STEPS[nextIndex].key;
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
};

export const ProgressBar = ({ interactive = true, onStepClick }: ProgressBarProps) => {
  const { currentStep, goToStep } = useStepNavigation(interactive);

  const handleStepClick = async (stepKey: AdmissionFormStepKey) => {
    if (!interactive) return;

    if (onStepClick) {
      const canNavigate = await onStepClick(stepKey);
      if (canNavigate) {
        goToStep(stepKey);
      }
    } else {
      goToStep(stepKey);
    }
  };

  return (
    <div className="flex justify-center gap-4 mb-8">
      {ADMISSION_STEPS.map((step, index) => {
        const isActive = step.key === currentStep;
        const isPast = ADMISSION_STEPS.findIndex((s) => s.key === currentStep) >= index;

        return (
          <button
            key={step.key}
            type="button"
            onClick={() => handleStepClick(step.key)}
            disabled={!interactive}
            className={cn(
              'relative h-12 w-48 flex items-center justify-center text-sm font-medium transition-colors',
              interactive ? 'cursor-pointer' : 'cursor-default'
            )}
          >
            <Chevron
              className="absolute inset-0 w-full h-full"
              fillClass={cn(
                isActive ? 'fill-primary' : isPast ? 'fill-primary/20' : 'fill-gray-200'
              )}
            />
            <span
              className={cn(
                'relative z-10 font-medium',
                isActive ? 'text-white' : 'text-primary-400'
              )}
            >
              {step.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

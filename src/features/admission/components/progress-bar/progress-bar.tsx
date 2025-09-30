'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useQueryState } from 'nuqs';
import { atom, useAtom } from 'jotai';
import { cn } from '@/lib/utils';
import { parseAsStringLiteral } from 'nuqs';
import { Chevron } from './chevron';

// Define the step configuration (generic)
export type StepConfig<T extends string = string> = {
  key: T;
  label: string;
  description?: string;
};

// Define admission form steps
export const ADMISSION_STEPS: StepConfig<
  'service' | 'personal' | 'license' | 'plan' | 'payment'
>[] = [
  { key: 'service', label: 'Service Type' },
  { key: 'personal', label: 'Personal Info' },
  { key: 'license', label: 'License' },
  { key: 'plan', label: 'Plan' },
  { key: 'payment', label: 'Payment' },
];

// Legacy export for backward compatibility
export const STEPS = ADMISSION_STEPS;
export type StepKey = 'service' | 'personal' | 'license' | 'plan' | 'payment';

// Function to get steps based on service type (backward compatibility)
export const getStepsForServiceType = (): typeof ADMISSION_STEPS => {
  return ADMISSION_STEPS;
};

// Create a jotai atom for internal state (generic)
const createStepAtom = <T extends string>(defaultStep: T) => atom<T>(defaultStep);

// Legacy admission step atom (removed - using generic version)

// Generic utility hook to get the current step
export const useCurrentStep = <T extends string>(
  steps: StepConfig<T>[],
  defaultStep: T,
  interactive = true
) => {
  const stepAtom = useMemo(() => createStepAtom(defaultStep), [defaultStep]);
  const [internalStep, setInternalStep] = useAtom(stepAtom);
  const sortOrder = steps.map((step) => step.key);
  const [externalStep, setExternalStep] = useQueryState(
    'step',
    parseAsStringLiteral(sortOrder).withDefault(defaultStep).withOptions({ shallow: !interactive })
  );

  useEffect(() => {
    setInternalStep(externalStep);
  }, [externalStep, setInternalStep]);

  return {
    currentStep: internalStep,
    setStep: setInternalStep,
    setExternalStep,
  };
};

// Generic utility hook for step navigation
export const useStepNavigation = <T extends string>(
  steps: StepConfig<T>[],
  defaultStep: T,
  interactive = true
) => {
  const { currentStep, setStep, setExternalStep } = useCurrentStep(steps, defaultStep, interactive);

  const currentIndex = useMemo(() => {
    return steps.findIndex((step) => step.key === currentStep);
  }, [currentStep, steps]);

  const goToStep = useCallback(
    (stepKey: T) => {
      setStep(stepKey);
      if (interactive) {
        setExternalStep(stepKey);
      }
    },
    [interactive, setExternalStep, setStep]
  );

  const goToNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      const nextStep = steps[nextIndex].key;
      goToStep(nextStep);
    }
  }, [currentIndex, goToStep, steps]);

  const goToPrevious = useCallback(() => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      const prevStep = steps[prevIndex].key;
      goToStep(prevStep);
    }
  }, [currentIndex, goToStep, steps]);

  return {
    currentStep,
    currentIndex,
    goToStep,
    goToNext,
    goToPrevious,
    isFirstStep: currentIndex === 0,
    isLastStep: currentIndex === steps.length - 1,
  };
};

// Define the props for the ProgressBar component (generic)
export type ProgressBarProps<T extends string = string> = {
  steps: StepConfig<T>[];
  defaultStep: T;
  interactive?: boolean;
  onStepClick?: (stepKey: T) => Promise<boolean> | boolean;
};

export const ProgressBar = <T extends string = string>({
  steps,
  defaultStep,
  interactive = true,
  onStepClick,
}: ProgressBarProps<T>) => {
  const { currentStep, goToStep } = useStepNavigation(steps, defaultStep, interactive);

  const handleStepClick = async (stepKey: T) => {
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
      {steps.map((step, index) => {
        const isActive = step.key === currentStep;
        const isPast = steps.findIndex((s) => s.key === currentStep) >= index;

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

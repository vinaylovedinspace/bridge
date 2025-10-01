'use client';

import { useCallback, useMemo } from 'react';
import { useQueryState, parseAsStringLiteral } from 'nuqs';
import { cn } from '@/lib/utils';
import { Chevron } from '@/features/enrollment/components/progress-bar/chevron';

export type StepConfig<T extends string = string> = {
  key: T;
  label: string;
};

type ProgressBarProps<T extends string> = {
  currentStep: T;
  onStepChange: (stepKey: T) => void;
  steps: StepConfig<T>[];
  interactive?: boolean;
};

export const ProgressBar = <T extends string>({
  currentStep,
  onStepChange,
  steps,
  interactive = true,
}: ProgressBarProps<T>) => {
  const handleStepClick = (stepKey: T) => {
    if (!interactive) return;
    onStepChange(stepKey);
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

type UseStepNavigationProps<T extends string> = {
  steps: StepConfig<T>[];
  firstStep: T;
};

export const useStepNavigation = <T extends string>({
  steps,
  firstStep,
}: UseStepNavigationProps<T>) => {
  const [currentStep, setCurrentStep] = useQueryState<T>(
    'step',
    parseAsStringLiteral(steps.map((step) => step.key)).withDefault(firstStep)
  );

  const currentIndex = useMemo(() => {
    return steps.findIndex((step) => step.key === currentStep);
  }, [currentStep, steps]);

  const goToStep = useCallback(
    (stepKey: T) => {
      setCurrentStep(stepKey);
    },
    [setCurrentStep]
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

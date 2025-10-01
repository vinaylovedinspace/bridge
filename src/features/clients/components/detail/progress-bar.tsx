'use client';

import { useCallback, useMemo } from 'react';
import { useQueryState, parseAsStringLiteral } from 'nuqs';
import { cn } from '@/lib/utils';
import { Chevron } from '@/features/enrollment/components/progress-bar/chevron';

export type ClientDetailStepKey = 'personal' | 'license' | 'plans';

type StepConfig = {
  key: ClientDetailStepKey;
  label: string;
};

const CLIENT_DETAIL_STEPS: StepConfig[] = [
  { key: 'personal', label: 'Personal Info' },
  { key: 'license', label: 'License' },
  { key: 'plans', label: 'Plans' },
];

const FIRST_STEP: ClientDetailStepKey = 'personal';

export const useClientDetailStepNavigation = () => {
  const [currentStep, setCurrentStep] = useQueryState<ClientDetailStepKey>(
    'step',
    parseAsStringLiteral(CLIENT_DETAIL_STEPS.map((step) => step.key)).withDefault(FIRST_STEP)
  );

  const currentIndex = useMemo(() => {
    return CLIENT_DETAIL_STEPS.findIndex((step) => step.key === currentStep);
  }, [currentStep]);

  const goToStep = useCallback(
    (stepKey: ClientDetailStepKey) => {
      setCurrentStep(stepKey);
    },
    [setCurrentStep]
  );

  const goToNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < CLIENT_DETAIL_STEPS.length) {
      const nextStep = CLIENT_DETAIL_STEPS[nextIndex].key;
      goToStep(nextStep);
    }
  }, [currentIndex, goToStep]);

  const goToPrevious = useCallback(() => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      const prevStep = CLIENT_DETAIL_STEPS[prevIndex].key;
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
    isLastStep: currentIndex === CLIENT_DETAIL_STEPS.length - 1,
  };
};

type ClientDetailProgressBarProps = {
  currentStep: ClientDetailStepKey;
  onStepChange: (stepKey: ClientDetailStepKey) => void;
};

export const ClientDetailProgressBar = ({
  currentStep,
  onStepChange,
}: ClientDetailProgressBarProps) => {
  const handleStepClick = (stepKey: ClientDetailStepKey) => {
    onStepChange(stepKey);
  };

  return (
    <div className="flex justify-center gap-4 mb-8">
      {CLIENT_DETAIL_STEPS.map((step, index) => {
        const isActive = step.key === currentStep;
        const isPast = CLIENT_DETAIL_STEPS.findIndex((s) => s.key === currentStep) >= index;

        return (
          <button
            key={step.key}
            type="button"
            onClick={() => handleStepClick(step.key)}
            className="relative h-12 w-48 flex items-center justify-center text-sm font-medium transition-colors cursor-pointer"
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

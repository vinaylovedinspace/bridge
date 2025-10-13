'use client';

import { useRef, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useAdmissionStepNavigation,
  ProgressBar,
} from '@/features/enrollment/components/progress-bar/progress-bar';
import { getMultistepAdmissionStepValidationFields } from '@/features/enrollment/lib/utils';
import { useEditAdmissionForm } from '../../../hooks/use-admission-form';
import { useUpdateEnrollmentForm } from '../../../hooks/submission-handlers/use-update-enrollment-form';
import { useUnsavedChanges } from '../../../hooks/use-unsaved-changes';
import { EditFormSteps } from './form-steps';
import { FormNavigation } from '@/components/ui/form-navigation';
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog';
import { Enrollment } from '@/server/db/plan';
import { useRouter } from 'next/navigation';

type StepKey = 'service' | 'personal' | 'license' | 'plan' | 'payment';

type EditAdmissionFormProps = {
  enrollment: NonNullable<Enrollment>;
};

export const EditAdmissionForm = ({ enrollment }: EditAdmissionFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const methods = useEditAdmissionForm(enrollment);
  const { trigger, getValues } = methods;

  const { currentStep, goToNext, goToPrevious, isFirstStep, isLastStep, goToStep } =
    useAdmissionStepNavigation();
  const { submitStep } = useUpdateEnrollmentForm(enrollment, getValues);

  const {
    showUnsavedChangesDialog,
    setShowUnsavedChangesDialog,
    hasCurrentStepChanges,
    handleStepNavigation,
    handleConfirmNavigation,
    handleCancelNavigation,
  } = useUnsavedChanges(enrollment, methods, currentStep);

  const getStepData = (stepKey: StepKey) => {
    switch (stepKey) {
      case 'service':
        return { serviceType: getValues('serviceType') };
      case 'personal':
        return getValues('client');
      case 'license':
        return {
          learningLicense: getValues('learningLicense'),
          drivingLicense: getValues('drivingLicense'),
        };
      case 'plan':
        return getValues('plan');
      case 'payment':
        return getValues('payment');
      default:
        return {};
    }
  };

  const handleNext = async () => {
    const currentStepKey = currentStep as StepKey;
    const fieldsToValidate = getMultistepAdmissionStepValidationFields(currentStepKey, getValues);
    const isStepValid = await trigger(fieldsToValidate);

    if (!isStepValid) {
      scrollRef.current?.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

      return;
    }

    // If no changes, just navigate
    if (!hasCurrentStepChanges() && !isLastStep) {
      goToNext();
      return;
    }

    // Submit changes
    setIsSubmitting(true);
    try {
      const stepData = getStepData(currentStepKey);
      const shouldRefresh = currentStepKey === 'plan' || currentStepKey === 'payment';

      const success = await submitStep(currentStepKey, stepData);

      if (success && !isLastStep) {
        goToNext();
      }

      if (shouldRefresh) {
        router.refresh();
      }

      if (isLastStep) {
        router.push('/enrollments');
      }
    } catch (error) {
      console.error(`Error submitting step ${currentStepKey}:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="h-full flex flex-col gap-10">
        <ProgressBar
          interactive={true}
          currentStep={currentStep}
          onStepChange={goToStep}
          onStepClick={async (step) => {
            const canNavigate = await handleStepNavigation(step as StepKey);
            if (canNavigate) {
              goToStep(step as StepKey);
            }
            return canNavigate;
          }}
        />

        <ScrollArea className="h-[calc(100vh-22rem)] pr-10" ref={scrollRef}>
          <form className="space-y-8 pr-4">
            <EditFormSteps currentStep={currentStep as StepKey} enrollment={enrollment} />
          </form>
        </ScrollArea>

        <FormNavigation
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          isSubmitting={isSubmitting}
          onCancel={() => router.back()}
          onPrevious={goToPrevious}
          onNext={handleNext}
        />
      </div>

      <UnsavedChangesDialog
        open={showUnsavedChangesDialog}
        onOpenChange={setShowUnsavedChangesDialog}
        onConfirm={() => handleConfirmNavigation(goToStep)}
        onCancel={handleCancelNavigation}
      />
    </FormProvider>
  );
};

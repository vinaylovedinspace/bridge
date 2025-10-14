'use client';

import { useRef, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useAdmissionStepNavigation,
  ProgressBar,
  AdmissionFormStepKey,
} from '@/features/enrollment/components/progress-bar/progress-bar';
import {
  getMultistepAdmissionStepValidationFields,
  getStepData,
} from '@/features/enrollment/lib/utils';
import { useEditAdmissionForm } from '../../hooks/use-admission-form';
import { useUpsertEnrollmentForm } from '../../hooks/submission-handlers/use-upsert-enrollment-form';
import { useUnsavedChanges } from '../../hooks/use-unsaved-changes';
import { FormNavigation } from '@/components/ui/form-navigation';
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog';
import { Enrollment } from '@/server/db/plan';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { EnrollmentFormSteps } from './form-steps';

type EditAdmissionFormProps = {
  enrollment: NonNullable<Enrollment>;
};

export const EditAdmissionForm = ({ enrollment }: EditAdmissionFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const formMethods = useEditAdmissionForm(enrollment);
  const { trigger, getValues, setValue } = formMethods;

  const { currentStep, goToNext, goToPrevious, isFirstStep, isLastStep, goToStep } =
    useAdmissionStepNavigation();

  const { submitStep } = useUpsertEnrollmentForm({ enrollment, getValues, setValue });

  const {
    showUnsavedChangesDialog,
    setShowUnsavedChangesDialog,
    hasCurrentStepChanges,
    handleStepNavigation,
    handleConfirmNavigation,
    handleCancelNavigation,
  } = useUnsavedChanges(enrollment, formMethods, currentStep);

  const handleNext = async () => {
    const fieldsToValidate = getMultistepAdmissionStepValidationFields(currentStep, getValues);
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
      const stepData = getStepData(currentStep, getValues);

      const success = await submitStep({
        currentStep,
        stepData,
        isLastStep,
      });

      if (success && !isLastStep) {
        goToNext();
      }

      if (success && isLastStep) {
        router.refresh();
        router.push('/enrollments');
      }
    } catch {
      toast.error('Failed to save your information. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormProvider {...formMethods}>
      <div className="h-full flex flex-col gap-10">
        <ProgressBar
          interactive={true}
          currentStep={currentStep}
          onStepChange={goToStep}
          onStepClick={async (step) => {
            const canNavigate = await handleStepNavigation(step as AdmissionFormStepKey);
            if (canNavigate) {
              goToStep(step as AdmissionFormStepKey);
            }
            return canNavigate;
          }}
        />

        <ScrollArea className="h-[calc(100vh-22rem)] pr-10" ref={scrollRef}>
          <form className="pr-1" data-testid="admission-multistep-form">
            <EnrollmentFormSteps currentStep={currentStep} enrollment={enrollment} />
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

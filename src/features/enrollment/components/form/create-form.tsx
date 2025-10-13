'use client';

import { useRef, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdmissionStepNavigation, ProgressBar } from '../progress-bar/progress-bar';
import { getMultistepAdmissionStepValidationFields, getStepData } from '../../lib/utils';
import { useUpsertEnrollmentForm } from '../../hooks/submission-handlers/use-upsert-enrollment-form';
import { useAddAdmissionForm } from '../../hooks/use-admission-form';
import { AdmissionFormStepKey } from '../../types';
import { FormNavigation } from '@/components/ui/form-navigation';
import { ClientType } from '../../server/db';
import { EnrollmentFormSteps } from './form-steps';

type MultistepFormProps = {
  existingClient?: ClientType;
};

export const MultistepForm = ({ existingClient }: MultistepFormProps) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const formMethods = useAddAdmissionForm(existingClient);

  const { trigger, getValues, setValue } = formMethods;

  const { currentStep, goToNext, goToPrevious, isFirstStep, isLastStep, goToStep } =
    useAdmissionStepNavigation();

  // Use the enrollment form submissions hook
  const { submitStep } = useUpsertEnrollmentForm({ getValues, setValue });

  const handleNext = async () => {
    const fieldsToValidate = getMultistepAdmissionStepValidationFields(currentStep, getValues);
    const isStepValid = await trigger(fieldsToValidate);

    if (!isStepValid) {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

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
      <div className="h-full flex flex-col gap-10" data-testid={`admission-step-${currentStep}`}>
        <ProgressBar interactive={false} currentStep={currentStep} onStepChange={goToStep} />

        {/* Form content - scrollable area */}
        <ScrollArea className="h-[calc(100vh-22rem)] pr-10" ref={scrollRef}>
          <form className="pr-1" data-testid="admission-multistep-form">
            <EnrollmentFormSteps currentStep={currentStep as AdmissionFormStepKey} />
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
    </FormProvider>
  );
};

export default MultistepForm;

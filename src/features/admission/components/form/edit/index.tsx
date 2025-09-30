'use client';

import { useState } from 'react';
import { FormProvider } from 'react-hook-form';
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useStepNavigation,
  ProgressBar,
} from '@/features/admission/components/progress-bar/progress-bar';
import { ClientDetail } from '@/server/db/client';
import { getMultistepAdmissionStepValidationFields } from '@/features/admission/lib/utils';
import { BranchConfig } from '@/server/db/branch';
import { useAdmissionForm } from '../../../hooks/use-admission-form';
import { useEditFormSubmissions } from '../../../hooks/use-edit-form-submissions';
import { useUnsavedChanges } from '../../../hooks/use-unsaved-changes';
import { EditFormSteps } from './form-steps';
import { FormNavigation } from './form-navigation';
import { UnsavedChangesDialog } from './unsaved-changes-dialog';

type StepKey = 'service' | 'personal' | 'license' | 'plan' | 'payment';

type EditAdmissionFormProps = {
  client: NonNullable<ClientDetail>;
  branchConfig: BranchConfig;
};

export const EditAdmissionForm = ({ client, branchConfig }: EditAdmissionFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useAdmissionForm(client);
  const { trigger, getValues } = methods;

  const { currentStep, goToNext, goToPrevious, isFirstStep, isLastStep, goToStep } =
    useStepNavigation(true);
  const { submitStep } = useEditFormSubmissions(client);

  const {
    showUnsavedChangesDialog,
    setShowUnsavedChangesDialog,
    hasCurrentStepChanges,
    handleDiscardChanges,
    handleStepNavigation,
    handleConfirmNavigation,
    handleCancelNavigation,
  } = useUnsavedChanges(client, methods, currentStep);

  const payment = client.plan?.[0]?.payment;
  const isPaymentProcessed =
    payment?.paymentStatus === 'FULLY_PAID' || payment?.paymentStatus === 'PARTIALLY_PAID';
  const isPaymentStep = currentStep === 'payment';
  const shouldDisablePaymentEdit = isPaymentStep && isPaymentProcessed;

  const getStepData = (stepKey: StepKey) => {
    switch (stepKey) {
      case 'service':
        return { serviceType: getValues('personalInfo.serviceType') };
      case 'personal':
        return getValues('personalInfo');
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
    try {
      const currentStepKey = currentStep as StepKey;
      const fieldsToValidate = getMultistepAdmissionStepValidationFields(currentStepKey, getValues);
      const isStepValid = await trigger(fieldsToValidate);
      if (!isStepValid) return;

      const hasChanges = hasCurrentStepChanges();
      if (!hasChanges) {
        console.log('No changes detected, skipping submission');
        if (isLastStep) {
          window.location.href = '/clients';
        } else {
          goToNext();
        }
        return;
      }

      setIsSubmitting(true);
      try {
        const stepData = getStepData(currentStepKey);
        const shouldRefresh = currentStepKey === 'plan' || currentStepKey === 'payment';

        const success = await submitStep(currentStepKey, stepData, isLastStep, shouldRefresh);

        if (success && !isLastStep) {
          goToNext();
        }
      } finally {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error(`Error in step ${currentStep}:`, error);
      setIsSubmitting(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="h-full flex flex-col py-2 gap-4">
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

        <ScrollArea className="h-[calc(100vh-20rem)] pr-10">
          <form className="space-y-8 pb-24">
            <EditFormSteps
              currentStep={currentStep as StepKey}
              client={client}
              branchConfig={branchConfig}
            />
          </form>
        </ScrollArea>

        <FormNavigation
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          isSubmitting={isSubmitting}
          shouldDisablePaymentEdit={shouldDisablePaymentEdit}
          hasCurrentStepChanges={hasCurrentStepChanges()}
          onPrevious={goToPrevious}
          onNext={handleNext}
          onDiscardChanges={handleDiscardChanges}
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

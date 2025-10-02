'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BranchConfig } from '@/server/db/branch';
import { Client } from '@/server/db/client';
import { ClientDetailProgressBar, useClientDetailStepNavigation } from './progress-bar';
import { ClientDetailSteps } from './client-detail-steps';
import { clientDetailFormSchema, ClientDetailFormValues } from '../../types/client-detail';
import { transformClientToFormData } from '../../lib/transform-client-data';
import { useUnsavedChanges } from '../../hooks/use-unsaved-changes';
import { FormNavigation } from '@/components/ui/form-navigation';
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog';
import {
  updateClientPersonalInfo,
  updateClientLearningLicense,
  updateClientDrivingLicense,
} from '../../server/action';
import { toast } from 'sonner';

type ClientDetailFormProps = {
  client: NonNullable<Client>;
  branchConfig: BranchConfig;
};

export const ClientDetailForm = ({ client, branchConfig }: ClientDetailFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues = transformClientToFormData(client);
  const methods = useForm<ClientDetailFormValues>({
    resolver: zodResolver(clientDetailFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const { trigger, getValues } = methods;
  const { currentStep, goToNext, goToPrevious, isFirstStep, isLastStep, goToStep } =
    useClientDetailStepNavigation();

  const {
    showUnsavedChangesDialog,
    setShowUnsavedChangesDialog,
    hasCurrentStepChanges,
    handleDiscardChanges,

    handleConfirmNavigation,
    handleCancelNavigation,
  } = useUnsavedChanges(methods, currentStep, defaultValues);

  const handleNext = async () => {
    try {
      setIsSubmitting(true);

      // Validate current step
      const isValid = await trigger();
      if (!isValid) {
        setIsSubmitting(false);
        return;
      }

      // Save data to server based on current step
      const formValues = getValues();
      let result: { error: boolean; message: string } | null = null;

      if (currentStep === 'personal') {
        result = await updateClientPersonalInfo(client.id, formValues.personalInfo);
      } else if (currentStep === 'license') {
        // Update both learning and driving licenses if they have data
        if (formValues.learningLicense) {
          const learningResult = await updateClientLearningLicense(
            client.id,
            formValues.learningLicense
          );
          if (learningResult.error) {
            result = learningResult;
          }
        }

        if (!result?.error && formValues.drivingLicense) {
          const drivingResult = await updateClientDrivingLicense(
            client.id,
            formValues.drivingLicense
          );
          if (drivingResult.error) {
            result = drivingResult;
          }
        }

        if (!result) {
          result = { error: false, message: 'Licence information updated successfully' };
        }
      }

      // Show error if save failed
      if (result?.error) {
        toast.error(result.message);
        setIsSubmitting(false);
        return;
      }

      // Show success message if we saved data
      if (result) {
        toast.success(result.message);
      }

      if (isLastStep) {
        // Navigate back to clients list
        window.location.href = '/clients';
      } else {
        goToNext();
      }
    } catch (error) {
      console.error('Error saving client data:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="h-full flex flex-col py-2 gap-4">
        <ClientDetailProgressBar currentStep={currentStep} onStepChange={goToStep} />

        <ScrollArea className="h-[calc(100vh-20rem)] pr-10">
          <form className="space-y-8 pb-24">
            <ClientDetailSteps
              currentStep={currentStep}
              client={client}
              branchConfig={branchConfig}
            />
          </form>
        </ScrollArea>

        <FormNavigation
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          isSubmitting={isSubmitting}
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

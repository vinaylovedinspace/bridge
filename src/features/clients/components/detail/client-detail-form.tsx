'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useAtomValue } from 'jotai';
import { branchConfigAtom } from '@/lib/atoms/branch-config';
import { useRouter } from 'next/navigation';

type ClientDetailFormProps = {
  client: NonNullable<Client>;
};

export const ClientDetailForm = ({ client }: ClientDetailFormProps) => {
  const branchConfig = useAtomValue(branchConfigAtom)!;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

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

  const saveLicenseStep = async (formValues: ClientDetailFormValues) => {
    if (formValues.learningLicense) {
      const learningResult = await updateClientLearningLicense(
        client.id,
        formValues.learningLicense
      );
      if (learningResult.error) {
        return learningResult;
      }
    }

    if (formValues.drivingLicense) {
      const drivingResult = await updateClientDrivingLicense(client.id, formValues.drivingLicense);
      if (drivingResult.error) {
        return drivingResult;
      }
    }

    return { error: false, message: 'Licence information updated successfully' };
  };

  const handleNext = async () => {
    const isValid = await trigger();
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const formValues = getValues();

      const result =
        currentStep === 'personal'
          ? await updateClientPersonalInfo(client.id, formValues.personalInfo)
          : await saveLicenseStep(formValues);

      if (result.error) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);

      if (isLastStep) {
        router.push('/clients');
      } else {
        goToNext();
      }
    } catch (error) {
      console.error(`Error saving ${currentStep} step:`, error);
      toast.error('Failed to save changes');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="h-full flex flex-col gap-10">
        <ClientDetailProgressBar currentStep={currentStep} onStepChange={goToStep} />

        <ScrollArea className="h-[calc(100vh-20.5rem)] pr-10">
          <form className="space-y-8 pr-4">
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

        <UnsavedChangesDialog
          open={showUnsavedChangesDialog}
          onOpenChange={setShowUnsavedChangesDialog}
          onConfirm={() => handleConfirmNavigation(goToStep)}
          onCancel={handleCancelNavigation}
        />
      </div>
    </FormProvider>
  );
};

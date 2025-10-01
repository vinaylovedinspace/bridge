'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BranchConfig } from '@/server/db/branch';
import { Client } from '@/server/db/client';
import { ClientDetailProgressBar, useClientDetailStepNavigation } from './progress-bar';
import { ClientDetailSteps } from './client-detail-steps';
import { ClientDetailNavigation } from './client-detail-navigation';
import { clientDetailFormSchema, ClientDetailFormValues } from '../../types/client-detail';
import { transformClientToFormData } from '../../lib/transform-client-data';

type ClientDetailFormProps = {
  client: NonNullable<Client>;
  branchConfig: BranchConfig;
};

export const ClientDetailForm = ({ client, branchConfig }: ClientDetailFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<ClientDetailFormValues>({
    resolver: zodResolver(clientDetailFormSchema),
    defaultValues: transformClientToFormData(client),
    mode: 'onChange',
  });

  const { trigger } = methods;
  const { currentStep, goToNext, goToPrevious, isFirstStep, isLastStep, goToStep } =
    useClientDetailStepNavigation();

  const handleNext = async () => {
    try {
      setIsSubmitting(true);

      // Validate current step
      const isValid = await trigger();
      if (!isValid) {
        setIsSubmitting(false);
        return;
      }

      // TODO: Save data to server

      if (isLastStep) {
        // Navigate back to clients list
        window.location.href = '/clients';
      } else {
        goToNext();
      }
    } catch (error) {
      console.error('Error saving client data:', error);
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

        <ClientDetailNavigation
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          isSubmitting={isSubmitting}
          onPrevious={goToPrevious}
          onNext={handleNext}
        />
      </div>
    </FormProvider>
  );
};

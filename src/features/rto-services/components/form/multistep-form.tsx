'use client';

import { Button } from '@/components/ui/button';
import { useCallback, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { rtoServicesFormSchema, RTOServiceFormValues } from '../../types';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PersonalInfoStep } from './steps/personal-info';
import { LicenseStep } from './steps/service';
import { PaymentContainer } from './steps/payment';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRTOServiceStepNavigation, RTOServiceProgressBar } from './progress-bar';
import {
  getMultistepRTOServiceStepValidationFields,
  getDefaultValuesForRTOServiceForm,
} from '../../lib/utils';
import { saveRTOService } from '../../server/action';
import { getRTOService } from '../../server/db';
import { createPaymentEntry } from '../../server/action';

type RTOServiceMultistepFormProps = {
  rtoService?: Awaited<ReturnType<typeof getRTOService>>;
};

export function RTOServiceMultistepForm({ rtoService }: RTOServiceMultistepFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<RTOServiceFormValues>({
    resolver: zodResolver(rtoServicesFormSchema),
    defaultValues: getDefaultValuesForRTOServiceForm(rtoService),
    mode: 'onChange',
  });

  const { trigger, getValues, setValue } = methods;

  const { currentStep, goToNext, goToPrevious, isFirstStep, isLastStep, goToStep } =
    useRTOServiceStepNavigation();

  // Map step keys to components
  const stepComponents = React.useMemo(() => {
    return {
      personal: {
        component: <PersonalInfoStep />,
        getData: () => getValues('personalInfo'),
      },
      license: {
        component: <LicenseStep />,
        getData: () => getValues('service'),
      },
      payment: {
        component: <PaymentContainer existingPayment={rtoService?.payment} />,
        getData: () => ({}),
      },
    };
  }, [getValues, rtoService?.payment]);

  // Step handlers
  const handlePersonalStep = useCallback(async () => {
    goToNext();
  }, [goToNext]);

  const handleLicenseStep = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const result = await saveRTOService(getValues());

      if (result.error) {
        toast.error(result.message);
        return;
      }

      setValue('clientId', result.clientId);
      setValue('serviceId', result.serviceId);

      toast.success(result.message);
      router.refresh();
      goToNext();
    } catch (error) {
      console.error('Error saving RTO service:', error);
      toast.error('Failed to save RTO service');
    } finally {
      setIsSubmitting(false);
    }
  }, [getValues, setValue, router, goToNext]);

  const handlePaymentStep = useCallback(async () => {
    const formData = getValues();
    const { serviceId, payment } = formData;

    if (!serviceId) {
      toast.error('Service ID is missing');
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentResult = await createPaymentEntry(payment, serviceId);

      if (paymentResult.error) {
        toast.error(paymentResult.message);
        return;
      }

      toast.success('RTO service and payment saved successfully');
      router.push('/rto-services');
      router.refresh();
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error('Failed to save payment');
    } finally {
      setIsSubmitting(false);
    }
  }, [getValues, router]);

  // Map step handlers
  const stepHandlers = React.useMemo(() => {
    return {
      personal: handlePersonalStep,
      license: handleLicenseStep,
      payment: handlePaymentStep,
    };
  }, [handlePersonalStep, handleLicenseStep, handlePaymentStep]);

  const handleNext = async () => {
    const fieldsToValidate = getMultistepRTOServiceStepValidationFields(currentStep, getValues);
    const isStepValid = await trigger(fieldsToValidate);

    if (!isStepValid) {
      return;
    }

    const handler = stepHandlers[currentStep];
    if (handler) {
      await handler();
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="h-full flex flex-col py-4 gap-10">
        <RTOServiceProgressBar
          currentStep={currentStep}
          onStepChange={goToStep}
          interactive={Boolean(rtoService?.id)}
        />

        {/* Form content - scrollable area */}
        <ScrollArea className="h-[calc(100vh-346px)]">
          <form className="space-y-8 pb-24 pr-1">{stepComponents[currentStep]?.component}</form>
        </ScrollArea>

        {/* Navigation buttons - fixed at the bottom */}
        <div className="bg-white py-4 px-6 border-t flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={goToPrevious}
            disabled={isFirstStep || isSubmitting}
          >
            Previous
          </Button>

          <Button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            {isLastStep ? 'Submit' : 'Next'}
          </Button>
        </div>
      </div>
    </FormProvider>
  );
}

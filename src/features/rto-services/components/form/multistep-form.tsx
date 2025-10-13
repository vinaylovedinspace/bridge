'use client';

import { useCallback, useRef, useState } from 'react';
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
import { saveRTOServiceWithPayment } from '../../server/action';
import { getRTOService } from '../../server/db';
import { FormNavigation } from '@/components/ui/form-navigation';
import { cn } from '@/lib/utils';
import { upsertPaymentWithOptionalTransaction } from '@/server/action/payments';

type RTOServiceMultistepFormProps = {
  rtoService?: Awaited<ReturnType<typeof getRTOService>>;
};

export function RTOServiceMultistepForm({ rtoService }: RTOServiceMultistepFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
        getData: () => getValues('client'),
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
    const formData = getValues();

    setIsSubmitting(true);
    try {
      // Use combined RTO service + payment transaction
      const result = await saveRTOServiceWithPayment(formData);

      if (result.error) {
        toast.error(result.message);
        return;
      }

      // Update form state with IDs if successful
      if (result.clientId) {
        setValue('client.id', result.clientId);
        setValue('payment.clientId', result.clientId);
      }
      if (result.serviceId) {
        setValue('service.id', result.serviceId);
      }
      if (result.paymentId) {
        setValue('payment.id', result.paymentId);
      }

      toast.success(result.message, {
        position: 'top-right',
      });

      goToNext();
    } catch (error) {
      console.error('Error saving RTO service:', error);
      toast.error('Failed to save RTO service');
    } finally {
      setIsSubmitting(false);
    }
  }, [getValues, goToNext, setValue]);

  const handlePaymentStep = useCallback(async () => {
    const formData = getValues();

    setIsSubmitting(true);
    try {
      const result = await upsertPaymentWithOptionalTransaction({
        payment: formData.payment,
      });

      if (result.error) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message, {
        position: 'top-right',
      });
      router.push('/rto-services');
      router.refresh();
    } catch (error) {
      console.error('Error saving RTO service with payment:', error);
      toast.error('Failed to save RTO service and payment');
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
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const handler = stepHandlers[currentStep];
    if (handler) {
      await handler();
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="h-full flex flex-col gap-10">
        <RTOServiceProgressBar
          currentStep={currentStep}
          onStepChange={goToStep}
          interactive={Boolean(rtoService?.id)}
        />

        {/* Form content - scrollable area */}
        <ScrollArea
          className={cn('h-[calc(100vh-22rem)]', {
            'h-[calc(100vh-20.5rem)]': rtoService?.id,
          })}
          ref={scrollRef}
        >
          <form className="space-y-8 pr-4">{stepComponents[currentStep]?.component}</form>
        </ScrollArea>

        <FormNavigation
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          isSubmitting={isSubmitting}
          onPrevious={goToPrevious}
          onNext={handleNext}
          onCancel={() => router.back()}
        />
      </div>
    </FormProvider>
  );
}

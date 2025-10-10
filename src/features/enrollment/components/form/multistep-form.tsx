'use client';

import { useRef, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ServiceTypeStep } from './steps/service-type';
import { PersonalInfoStep } from './steps/personal-info';
import { LicenseStep } from './steps/license';
import { PlanStep } from './steps/plan';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdmissionStepNavigation, ProgressBar } from '../progress-bar/progress-bar';
import { PaymentContainer } from './steps/payment';
import { getMultistepAdmissionStepValidationFields } from '../../lib/utils';
import { useAddFormSubmissions } from '../../hooks/use-add-form-submissions';
import { getClientById } from '../../server/action';
import { useAddAdmissionForm } from '../../hooks/use-admission-form';
import { AdmissionFormValues } from '../../types';
import { FormNavigation } from '@/components/ui/form-navigation';

type MultistepFormProps = {
  existingClient?: Awaited<ReturnType<typeof getClientById>>['data'];
};

export const MultistepForm = ({ existingClient }: MultistepFormProps) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const methods = useAddAdmissionForm(existingClient);

  const { trigger, getValues, watch, setValue } = methods;

  const { currentStep, goToNext, goToPrevious, isFirstStep, isLastStep, goToStep } =
    useAdmissionStepNavigation();

  // Watch all form values to detect changes
  const watchedValues = watch();
  const clientId = watch('client.id');

  // Use the enrollment form submissions hook
  const { submitStep } = useAddFormSubmissions(getValues, setValue);

  // Map step keys to components and their corresponding actions
  const stepComponents = React.useMemo(() => {
    return {
      service: {
        component: <ServiceTypeStep />,
        getData: () => ({ serviceType: getValues('serviceType') }),
      },
      personal: {
        component: <PersonalInfoStep />,
        getData: () => getValues('client'),
      },
      license: {
        component: <LicenseStep />,

        getData: () => ({
          learningLicense: getValues('learningLicense'),
          drivingLicense: getValues('drivingLicense'),
        }),
      },
      plan: {
        component: <PlanStep currentClientId={clientId} />,
        getData: () => getValues('plan'),
      },
      payment: {
        component: <PaymentContainer />,
        getData: () => getValues('payment'),
      },
    };
  }, [clientId, getValues]);

  // Check if current step has any changes compared to initial values
  const hasCurrentStepChanges = (): boolean => {
    const initialValues = methods.formState.defaultValues as AdmissionFormValues;
    const currentStepKey = currentStep;

    const getCurrentStepValues = () => {
      switch (currentStepKey) {
        case 'service':
          return { serviceType: watchedValues.serviceType };
        case 'personal':
          return watchedValues.client;
        case 'license':
          return {
            learningLicense: watchedValues.learningLicense,
            drivingLicense: watchedValues.drivingLicense,
          };
        case 'plan':
          return watchedValues.plan;
        case 'payment':
          return watchedValues.payment;
        default:
          return {};
      }
    };

    const getInitialStepValues = () => {
      switch (currentStepKey) {
        case 'service':
          return { serviceType: initialValues.serviceType };
        case 'personal':
          return initialValues.client;
        case 'license':
          return {
            learningLicense: initialValues.learningLicense,
            drivingLicense: initialValues.drivingLicense,
          };
        case 'plan':
          return initialValues.plan;
        case 'payment':
          return initialValues.payment;
        default:
          return {};
      }
    };

    const currentValues = getCurrentStepValues();
    const initialStepValues = getInitialStepValues();

    // Deep comparison to check for changes
    return JSON.stringify(currentValues) !== JSON.stringify(initialStepValues);
  };

  const handleNext = async () => {
    const fieldsToValidate = getMultistepAdmissionStepValidationFields(currentStep, getValues);
    const isStepValid = await trigger(fieldsToValidate);

    if (!isStepValid) {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // If no changes, just navigate
    if (!hasCurrentStepChanges()) {
      if (isLastStep) {
        router.refresh();
        router.push('/dashboard');
      } else {
        goToNext();
      }
      return;
    }

    // Submit changes
    setIsSubmitting(true);
    try {
      const stepData = stepComponents[currentStep].getData();
      const success = await submitStep(currentStep, stepData, isLastStep);

      if (success && !isLastStep) {
        goToNext();
      }
    } catch (error) {
      console.error(`Error submitting step ${currentStep}:`, error);
      toast.error('Failed to save your information. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="h-full flex flex-col gap-10" data-testid={`admission-step-${currentStep}`}>
        <ProgressBar interactive={false} currentStep={currentStep} onStepChange={goToStep} />

        {/* Form content - scrollable area */}
        <ScrollArea className="h-[calc(100vh-22rem)] pr-10" ref={scrollRef}>
          <form className="pr-1" data-testid="admission-multistep-form">
            {stepComponents[currentStep as keyof typeof stepComponents]?.component}
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

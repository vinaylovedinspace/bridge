'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
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
import { DEFAULT_STATE } from '@/lib/constants/business';

export function RTOServiceMultistepForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<RTOServiceFormValues>({
    resolver: zodResolver(rtoServicesFormSchema),
    defaultValues: {
      personalInfo: {
        educationalQualification: 'GRADUATE',
        citizenStatus: 'BIRTH',
        isCurrentAddressSameAsPermanentAddress: false,
        state: DEFAULT_STATE,
        permanentState: DEFAULT_STATE,
      },
      service: {
        type: 'NEW_DRIVING_LICENCE',
        license: {},
      },
    },
    mode: 'onChange',
  });

  const { trigger, getValues, watch } = methods;

  const { currentStep, goToNext, goToPrevious, isFirstStep, isLastStep, goToStep } =
    useRTOServiceStepNavigation();

  // Watch all form values to detect changes
  const watchedValues = watch();

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
        component: <PaymentContainer />,
        getData: () => ({}),
      },
    };
  }, [getValues]);

  // Get initial default values for comparison
  const getInitialValues = (): RTOServiceFormValues => {
    return methods.formState.defaultValues as RTOServiceFormValues;
  };

  // Check if current step has any changes compared to initial values
  const hasCurrentStepChanges = (): boolean => {
    const initialValues = getInitialValues();
    const currentStepKey = currentStep;

    const getCurrentStepValues = () => {
      switch (currentStepKey) {
        case 'personal':
          return watchedValues.personalInfo;
        case 'license':
          return watchedValues.service;
        case 'payment':
          return {};
        default:
          return {};
      }
    };

    const getInitialStepValues = () => {
      switch (currentStepKey) {
        case 'personal':
          return initialValues.personalInfo;
        case 'license':
          return initialValues.service;
        case 'payment':
          return {};
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
    try {
      const currentStepKey = currentStep;

      // Validate current step fields
      const fieldsToValidate =
        currentStepKey === 'personal'
          ? ['personalInfo' as const]
          : currentStepKey === 'license'
            ? ['service' as const]
            : [];

      const isStepValid = await trigger(fieldsToValidate);

      if (!isStepValid) {
        return;
      }

      const hasChanges = hasCurrentStepChanges();

      if (!hasChanges) {
        if (isLastStep) {
          router.refresh();
          router.push('/rto-services');
        } else {
          goToNext();
        }
        return;
      }

      // Execute step-specific action only if there are changes
      setIsSubmitting(true);
      try {
        // TODO: Implement step-by-step submission
        if (isLastStep) {
          // Final submission
          toast.success('RTO service submitted successfully');
          router.refresh();
          router.push('/rto-services');
        } else {
          goToNext();
        }
      } catch (error) {
        console.error('Error in step submission:', error);
        toast.error('An unexpected error occurred');
      } finally {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error(`Error in step ${currentStep}:`, error);
      toast.error('An error occurred while processing your information');
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="h-full flex flex-col py-4 gap-10">
        <RTOServiceProgressBar currentStep={currentStep} onStepChange={goToStep} />

        {/* Form content - scrollable area */}
        <ScrollArea className="h-[calc(100vh-316px)]">
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

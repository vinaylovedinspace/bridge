'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { admissionFormSchema, AdmissionFormValues } from '../../types';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ServiceTypeStep } from './steps/service-type';
import { PersonalInfoStep } from './steps/personal-info';
import { LicenseStep } from './steps/license';
import { PlanStep } from './steps/plan';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStepNavigation, ProgressBar } from '../progress-bar/progress-bar';
import { PaymentContainer } from './steps/payment';
import { DEFAULT_STATE } from '@/lib/constants/business';
import {
  getMultistepAdmissionStepValidationFields,
  mapClientToPersonalInfo,
  mapLearningLicense,
  mapDrivingLicense,
} from '../../lib/utils';
import { BranchConfig } from '@/server/db/branch';
import { useEnrollmentFormSubmissions } from '../../hooks/use-enrollment-form-submissions';
import { getClientById } from '../../server/action';

type MultistepFormProps = {
  branchConfig: BranchConfig;
  existingClient?: Awaited<ReturnType<typeof getClientById>>['data'];
};

export const MultistepForm = ({ branchConfig, existingClient }: MultistepFormProps) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getDefaultValues = (): AdmissionFormValues => {
    const baseDefaults = {
      serviceType: 'FULL_SERVICE' as const,
      plan: {
        vehicleId: '',
        numberOfSessions: 21,
        sessionDurationInMinutes: 30,
        joiningDate: new Date(),
        joiningTime: '12:00',
        serviceType: 'FULL_SERVICE' as const,
      },
      payment: {
        discount: 0,
        paymentMode: 'PAYMENT_LINK' as const,
      },
    };

    if (existingClient) {
      return {
        ...baseDefaults,
        personalInfo: mapClientToPersonalInfo(existingClient),
        learningLicense: mapLearningLicense(existingClient.learningLicense),
        drivingLicense: mapDrivingLicense(existingClient.drivingLicense),
        clientId: existingClient.id,
      } as AdmissionFormValues;
    }

    return {
      ...baseDefaults,
      personalInfo: {
        educationalQualification: 'GRADUATE',
        citizenStatus: 'BIRTH',
        isCurrentAddressSameAsPermanentAddress: false,
        state: DEFAULT_STATE,
        permanentState: DEFAULT_STATE,
      },
      learningLicense: {},
      drivingLicense: {},
    } as AdmissionFormValues;
  };

  const methods = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: getDefaultValues(),
    mode: 'onChange',
  });

  const { trigger, getValues, watch, setValue } = methods;

  const { currentStep, goToNext, goToPrevious, isFirstStep, isLastStep, goToStep } =
    useStepNavigation(false);

  // Watch all form values to detect changes
  const watchedValues = watch();
  const clientId = watch('clientId');

  // Use the enrollment form submissions hook
  const { submitStep } = useEnrollmentFormSubmissions(getValues, setValue);

  // Map step keys to components and their corresponding actions
  const stepComponents = React.useMemo(() => {
    return {
      service: {
        component: <ServiceTypeStep />,
        getData: () => ({ serviceType: getValues('serviceType') }),
      },
      personal: {
        component: <PersonalInfoStep />,
        getData: () => getValues('personalInfo'),
      },
      license: {
        component: <LicenseStep branchServiceCharge={branchConfig.licenseServiceCharge ?? 0} />,

        getData: () => ({
          learningLicense: getValues('learningLicense'),
          drivingLicense: getValues('drivingLicense'),
        }),
      },
      plan: {
        component: <PlanStep branchConfig={branchConfig} currentClientId={clientId} />,
        getData: () => getValues('plan'),
      },
      payment: {
        component: <PaymentContainer />,
        getData: () => getValues('payment'),
      },
    };
  }, [branchConfig, clientId, getValues]);

  // Get initial default values for comparison (reuse form's defaultValues)
  const getInitialValues = (): AdmissionFormValues => {
    return methods.formState.defaultValues as AdmissionFormValues;
  };

  // Check if current step has any changes compared to initial values
  const hasCurrentStepChanges = (): boolean => {
    const initialValues = getInitialValues();
    const currentStepKey = currentStep;

    const getCurrentStepValues = () => {
      switch (currentStepKey) {
        case 'service':
          return { serviceType: watchedValues.serviceType };
        case 'personal':
          return watchedValues.personalInfo;
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
          return initialValues.personalInfo;
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
    try {
      const currentStepKey = currentStep;

      const fieldsToValidate = getMultistepAdmissionStepValidationFields(currentStepKey, getValues);

      const isStepValid = await trigger(fieldsToValidate);

      if (!isStepValid) {
        return;
      }

      const hasChanges = hasCurrentStepChanges();

      if (!hasChanges) {
        if (isLastStep) {
          router.refresh();
          router.push('/dashboard'); // Redirect to dashboard or another appropriate page
        } else {
          goToNext();
        }
        return;
      }

      // Step 2: Execute the step-specific action only if there are changes
      setIsSubmitting(true);
      try {
        const stepData = stepComponents[currentStepKey].getData();

        const success = await submitStep(currentStepKey, stepData, isLastStep);

        if (success && !isLastStep) {
          goToNext();
        }
      } catch (error) {
        console.error('Error in step submission:', error);
        toast.error('An unexpected error occurred');
      } finally {
        setIsSubmitting(false);
      }
    } catch (error) {
      // Handle any unexpected errors
      console.error(`Error in step ${currentStep}:`, error);
      toast.error('An error occurred while processing your information');
    }
  };

  return (
    <FormProvider {...methods}>
      <div
        className="h-full flex flex-col py-4 gap-10"
        data-testid={`admission-step-${currentStep}`}
      >
        <ProgressBar interactive={false} currentStep={currentStep} onStepChange={goToStep} />

        {/* Form content - scrollable area */}
        <ScrollArea className="h-[calc(100vh-316px)] pr-10">
          <form className="space-y-8 pb-24" data-testid="admission-multistep-form">
            {stepComponents[currentStep as keyof typeof stepComponents]?.component}
          </form>
        </ScrollArea>

        {/* Navigation buttons - fixed at the bottom */}
        <div className="bg-white py-4 px-6 border-t flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={goToPrevious}
            disabled={isFirstStep || isSubmitting}
            data-testid="admission-previous-button"
          >
            Previous
          </Button>

          <Button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
            isLoading={isSubmitting}
            data-testid={isLastStep ? 'admission-submit-button' : 'admission-next-button'}
          >
            {isLastStep ? 'Submit' : 'Next'}
          </Button>
        </div>
      </div>
    </FormProvider>
  );
};

export default MultistepForm;

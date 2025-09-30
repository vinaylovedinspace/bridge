'use client';

import { Button } from '@/components/ui/button';
import { useCallback, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import {
  admissionFormSchema,
  AdmissionFormValues,
  PersonalInfoValues,
  PlanValues,
  LearningLicenseValues,
  DrivingLicenseValues,
  PaymentValues,
} from '../../types';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ServiceTypeStep } from './steps/service-type';
import { PersonalInfoStep } from './steps/personal-info';
import { LicenseStep } from './steps/license';
import { PlanStep } from './steps/plan';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStepNavigation, ProgressBar } from '../progress-bar/progress-bar';
import { ActionReturnType } from '@/types/actions';
import {
  createClient,
  createLearningLicense,
  createDrivingLicense,
  createPlan,
  createPayment,
} from '../../server/action';
import { PaymentContainer } from './steps/payment';
import { DEFAULT_STATE } from '@/lib/constants/business';
import { getMultistepAdmissionStepValidationFields } from '../../lib/utils';
import { BranchConfig } from '@/server/db/branch';

type MultistepFormProps = {
  branchConfig: BranchConfig;
};

export const MultistepForm = ({ branchConfig }: MultistepFormProps) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: {
      personalInfo: {
        educationalQualification: 'GRADUATE',
        citizenStatus: 'BIRTH',
        isCurrentAddressSameAsPermanentAddress: false,
        state: DEFAULT_STATE,
        permanentState: DEFAULT_STATE,
        serviceType: 'FULL_SERVICE' as const,
      },
      learningLicense: {},
      drivingLicense: {},
      plan: {
        vehicleId: '',
        numberOfSessions: 21,
        sessionDurationInMinutes: 30,
        joiningDate: new Date(),
        joiningTime: '12:00',
      },
      payment: {
        vehicleRentAmount: 0,
        discount: 0,
      },
    },
    mode: 'onChange',
  });

  const { trigger, getValues, watch, setValue } = methods;

  const { currentStep, goToNext, goToPrevious, isFirstStep, isLastStep, goToStep } =
    useStepNavigation(false);

  // Watch all form values to detect changes
  const watchedValues = watch();

  // Define step actions
  const handleServiceTypeStep = async (data: { serviceType: string }): ActionReturnType => {
    // Service type step doesn't need server action, just validation
    console.log('Service type selected:', data.serviceType);
    return Promise.resolve({
      error: false,
      message: 'Service type selected successfully',
    });
  };

  const handlePersonalStep = useCallback(
    async (data: PersonalInfoValues): ActionReturnType => {
      console.log('Processing personal info:', data);
      const result = await createClient(data);

      // If the client was created successfully, store the clientId for later steps
      if (!result.error && result.clientId) {
        setValue('clientId', result.clientId);
      }

      return result;
    },
    [setValue]
  );

  const handleLicenseStep = useCallback(
    async (data: {
      learningLicense?: LearningLicenseValues;
      drivingLicense?: DrivingLicenseValues;
    }): ActionReturnType => {
      console.log('Processing license info:', data);

      const clientId = getValues('clientId');
      if (!clientId) {
        return Promise.resolve({
          error: true,
          message: 'Client ID not found. Please complete the personal information step first.',
        });
      }

      const { learningLicense, drivingLicense } = data;

      const hasClass = learningLicense?.class;
      const hasLearningLicense = learningLicense && Object.keys(learningLicense).length > 0;
      const hasDrivingLicense = drivingLicense && Object.keys(drivingLicense).length > 0;

      try {
        let learningResult: Awaited<ActionReturnType> | null = null;
        let drivingResult: Awaited<ActionReturnType> | null = null;

        // Handle learning license if present
        if (hasLearningLicense) {
          learningResult = await createLearningLicense({
            ...learningLicense,
            clientId,
          });

          // If learning license fails, return the learning result
          if (learningResult.error) {
            return learningResult;
          }
        }

        // Handle driving license if present
        if (hasDrivingLicense || hasClass) {
          drivingResult = await createDrivingLicense({
            ...drivingLicense,
            class: learningLicense?.class || [],
            clientId,
          });

          // If driving license fails, return its error
          if (drivingResult.error) {
            return drivingResult;
          }
        }

        // Return success message based on what was processed
        if (learningResult && drivingResult) {
          return {
            error: false,
            message: 'Learning and driving license information saved successfully',
          };
        } else if (learningResult) {
          return {
            error: false,
            message: 'Learning license information saved successfully',
          };
        } else if (drivingResult) {
          return {
            error: false,
            message: 'Driving license information saved successfully',
          };
        }

        // If no licenses were processed, allow progression (licenses are optional)
        return {
          error: false,
          message: 'License step completed',
        };
      } catch (error) {
        console.error('Error processing license data:', error);
        return Promise.resolve({
          error: true,
          message: 'An unexpected error occurred while processing license data',
        });
      }
    },
    [getValues]
  );

  const handlePlanStep = useCallback(
    async (data: PlanValues): ActionReturnType => {
      const clientId = getValues('clientId');
      if (!clientId) {
        return Promise.resolve({
          error: true,
          message: 'Client ID not found. Please complete the personal information step first.',
        });
      }

      // Check slot availability before creating the plan
      try {
        const { getSessions } = await import('@/server/actions/sessions');
        const sessions = await getSessions(data.vehicleId);

        const selectedDate = data.joiningDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        const selectedTime = `${data.joiningDate.getHours().toString().padStart(2, '0')}:${data.joiningDate.getMinutes().toString().padStart(2, '0')}`;

        // Check if the selected slot is already taken (excluding current client's sessions)
        const conflictSession = sessions.find((session) => {
          const sessionDate = session.sessionDate; // Already in YYYY-MM-DD format
          const sessionTime = session.startTime.substring(0, 5); // Remove seconds if present
          const isCurrentClientSession = clientId && session.clientId === clientId;
          return (
            sessionDate === selectedDate && sessionTime === selectedTime && !isCurrentClientSession
          );
        });

        if (conflictSession) {
          return Promise.resolve({
            error: true,
            message:
              'The selected time slot is not available. Please choose an available time slot from the suggestions above.',
          });
        }
      } catch (error) {
        console.error('Error checking slot availability:', error);
        return Promise.resolve({
          error: true,
          message: 'Unable to verify slot availability. Please try again.',
        });
      }

      const result = await createPlan({
        ...data,
        clientId,
      });

      if (result.planId) {
        setValue('planId', result.planId);
      }

      // Sessions are automatically created/updated by the createPlan server action
      // No need to create them again here
      return result;
    },
    [getValues, setValue]
  );

  const handlePaymentStep = useCallback(
    async (data: PaymentValues): ActionReturnType => {
      const clientId = getValues('clientId');
      const planId = getValues('planId');

      if (!clientId) {
        return Promise.resolve({
          error: true,
          message: 'Client ID not found. Please complete the personal information step first.',
        });
      }

      if (!planId) {
        return Promise.resolve({
          error: true,
          message: 'Plan ID not found. Please complete the plan step first.',
        });
      }

      const result = await createPayment({
        ...data,
        clientId,
        planId,
      });

      if (!result.error && result.paymentId) {
        setValue('paymentId', result.paymentId);
      }

      return result;
    },
    [getValues, setValue]
  );

  // Map step keys to components and their corresponding actions
  const stepComponents = React.useMemo(() => {
    return {
      service: {
        component: <ServiceTypeStep />,
        onSubmit: (data: unknown) => handleServiceTypeStep(data as { serviceType: string }),
        getData: () => ({ serviceType: getValues('personalInfo.serviceType') }),
      },
      personal: {
        component: <PersonalInfoStep />,
        onSubmit: (data: unknown) => handlePersonalStep(data as PersonalInfoValues),
        getData: () => getValues('personalInfo'),
      },
      license: {
        component: <LicenseStep branchServiceCharge={branchConfig.licenseServiceCharge ?? 0} />,
        onSubmit: (data: unknown) =>
          handleLicenseStep(
            data as {
              learningLicense?: LearningLicenseValues;
              drivingLicense?: DrivingLicenseValues;
            }
          ),
        getData: () => ({
          learningLicense: getValues('learningLicense'),
          drivingLicense: getValues('drivingLicense'),
        }),
      },
      plan: {
        component: <PlanStep branchConfig={branchConfig} currentClientId={undefined} />,
        onSubmit: (data: unknown) => handlePlanStep(data as PlanValues),
        getData: () => getValues('plan'),
      },
      payment: {
        component: (
          <PaymentContainer clientId={getValues('clientId')} paymentId={getValues('paymentId')} />
        ),
        onSubmit: (data: unknown) => handlePaymentStep(data as PaymentValues),
        getData: () => getValues('payment'),
      },
    };
  }, [
    branchConfig,
    getValues,
    handleLicenseStep,
    handlePaymentStep,
    handlePlanStep,
    handlePersonalStep,
  ]);

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
          return { serviceType: watchedValues.personalInfo?.serviceType };
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
          return { serviceType: initialValues.personalInfo?.serviceType };
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
      // Step 1: Generate validation fields on demand for the current step
      const currentStepKey = currentStep;

      const fieldsToValidate = getMultistepAdmissionStepValidationFields(currentStepKey, getValues);
      console.log(fieldsToValidate, getValues('payment'));

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
        // Get the current step's data and action handler
        const stepData = stepComponents[currentStepKey].getData();
        const result = await stepComponents[currentStepKey].onSubmit(stepData);

        // Step 3: Handle the result of the step action
        if (result.error) {
          toast.error(result.message || 'Failed to save information');
        } else {
          // Step 4: On success, show feedback and handle navigation
          toast.success(result.message || 'Information saved successfully', {
            position: 'top-right',
          });

          // If it's the last step, we're done with the form
          if (isLastStep) {
            router.refresh();
            router.push('/dashboard'); // Redirect to dashboard or another appropriate page
          } else {
            // Otherwise, proceed to the next step
            goToNext();
          }
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
        className="h-full flex flex-col py-10 gap-4"
        data-testid={`admission-step-${currentStep}`}
      >
        <ProgressBar interactive={false} currentStep={currentStep} onStepChange={goToStep} />

        {/* Form content - scrollable area */}
        <ScrollArea className="h-[calc(100vh-340px)] pr-10">
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

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCallback, useRef } from 'react';
import {
  PersonalInfoValues,
  PlanValues,
  LearningLicenseValues,
  DrivingLicenseValues,
  AdmissionFormValues,
} from '@/features/enrollment/types';
import {
  createClient,
  createLearningLicense,
  createDrivingLicense,
  createPlanWithPayment,
  createPayment,
} from '@/features/enrollment/server/action';
import { ActionReturnType } from '@/types/actions';
import { UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { getSessions } from '@/server/actions/sessions';
import { LAST_ENROLLMENT_CLIENT_ID, LAST_ENROLLMENT_STEP } from '@/lib/constants/business';
import { hasValidData, getLicenseSuccessMessage, handleStepError } from './form-submission-utils';
import { formatTimeString, formatDateString } from '@/lib/date-time-utils';

export const useAddFormSubmissions = (
  getValues: UseFormGetValues<AdmissionFormValues>,
  setValue: UseFormSetValue<AdmissionFormValues>
) => {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);

  const handlePersonalStep = useCallback(
    async (data: PersonalInfoValues): ActionReturnType => {
      const result = await createClient(data);

      // If the client was created successfully, store the clientId for later steps
      if (!result.error && result.clientId) {
        setValue('client.id', result.clientId);
      } else if (result.error) {
        return {
          error: true,
          message: 'Failed to create client. Please try again.',
        };
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
      const clientId = getValues('client.id');

      if (!clientId) {
        return {
          error: true,
          message: 'Client ID not found. Please complete the personal information step first.',
        };
      }

      const { learningLicense, drivingLicense } = data;

      const hasClass = learningLicense?.class && learningLicense.class.length > 0;
      const hasLearningLicense = hasValidData(
        learningLicense as Record<string, unknown> | undefined
      );
      const hasDrivingLicense = hasValidData(drivingLicense as Record<string, unknown> | undefined);

      try {
        let learningResult: Awaited<ActionReturnType> | null = null;
        let drivingResult: Awaited<ActionReturnType> | null = null;

        // Handle learning license if present
        if (hasLearningLicense && learningLicense) {
          learningResult = await createLearningLicense({
            ...learningLicense,
            clientId,
          });

          // If learning license fails, return the learning result
          if (learningResult.error) {
            console.error('Failed to create learning license:', learningResult.message);
            return learningResult;
          }
        }

        // Handle driving license if present
        if ((hasDrivingLicense || hasClass) && (drivingLicense || hasClass)) {
          drivingResult = await createDrivingLicense({
            ...(drivingLicense || {}),
            class: learningLicense?.class || drivingLicense?.class || [],
            clientId,
          });

          // If driving license fails, return its error
          if (drivingResult.error) {
            console.error('Failed to create driving license:', drivingResult.message);
            return drivingResult;
          }
        }

        // Return success message based on what was processed
        return {
          error: false,
          message: getLicenseSuccessMessage(!!learningResult, !!drivingResult, 'create'),
        };
      } catch (error) {
        return handleStepError(error, 'licence');
      }
    },
    [getValues]
  );

  const handlePlanStep = useCallback(
    async (data: PlanValues): ActionReturnType => {
      const clientId = getValues('client.id');
      const serviceType = getValues('serviceType');

      // Validate client ID (not validated by Zod since it's added in the hook)
      if (!clientId) {
        return {
          error: true,
          message: 'Client ID not found. Please complete the personal information step first.',
        };
      }

      // Check slot availability before proceeding
      try {
        const sessions = await getSessions(data.vehicleId);

        const selectedDate = formatDateString(data.joiningDate);
        const selectedTime = formatTimeString(data.joiningDate);

        // Check if the selected slot is already taken (excluding current client's sessions)
        const conflictSession = sessions.find((session) => {
          const sessionDate = session.sessionDate;
          const sessionTime = session.startTime.substring(0, 5); // Remove seconds if present
          const isCurrentClientSession = session.clientId === clientId;
          return (
            sessionDate === selectedDate && sessionTime === selectedTime && !isCurrentClientSession
          );
        });

        if (conflictSession) {
          return {
            error: true,
            message:
              'The selected time slot is not available. Please choose an available time slot from the suggestions above.',
          };
        }
      } catch (error) {
        console.error('Error checking slot availability:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          error: true,
          message: `Unable to verify slot availability: ${errorMessage}`,
        };
      }
      // Get the existing plan ID if it exists (prefer plan.id over planId)
      const existingPlanId = getValues('plan.id') || getValues('plan.id') || undefined;

      const planInput = {
        ...data,
        id: existingPlanId,
        serviceType: serviceType || data.serviceType,
        clientId,
      };

      const paymentInput = getValues('payment');

      const result = await createPlanWithPayment(planInput, paymentInput);

      // Update form state with plan ID if successful
      if (!result.error) {
        setValue('plan.id', result.planId);
        setValue('plan.id', result.planId); // Also store in plan.id for consistency
        setValue('payment.id', result.paymentId);
        setValue('payment.id', result.paymentId);
      } else if (result.error) {
        console.error('Failed to create/update plan:', result.message);
      }

      return {
        error: false,
        message: 'Plan details validated successfully',
      };
    },
    [getValues, setValue]
  );

  const handlePaymentStep = useCallback(async (): ActionReturnType => {
    const formValues = getValues();

    if (!formValues.client.id || !formValues.plan.id)
      return {
        error: true,
        message: 'Payment information was not saved. Please try again later',
      };

    const paymentInput = {
      ...formValues.payment,
      clientId: formValues.client.id,
    };

    return await createPayment(paymentInput, formValues.plan.id);
  }, [getValues]);

  const submitStep = async (
    stepKey: string,
    stepData: unknown,
    isLastStep: boolean
  ): Promise<boolean> => {
    // Abort any previous ongoing submission
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this submission
    abortControllerRef.current = new AbortController();

    const stepHandlers: Record<string, () => Promise<{ error: boolean; message: string }>> = {
      personal: () => {
        return handlePersonalStep(stepData as PersonalInfoValues);
      },
      license: () => {
        return handleLicenseStep(
          stepData as {
            learningLicense?: LearningLicenseValues;
            drivingLicense?: DrivingLicenseValues;
          }
        );
      },
      plan: () => {
        return handlePlanStep(stepData as PlanValues);
      },
      payment: () => handlePaymentStep(),
    };

    const handler = stepHandlers[stepKey];

    try {
      const result = await handler();

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return false;
      }

      if (result?.error) {
        toast.error(result.message || 'Failed to save information');
        return false;
      }

      // toast.success(result?.message || 'Information saved successfully', {
      //   position: 'top-right',
      // });

      localStorage.setItem(LAST_ENROLLMENT_CLIENT_ID, JSON.stringify(getValues('client.id')));

      if (isLastStep) {
        localStorage.removeItem(LAST_ENROLLMENT_CLIENT_ID);
        localStorage.removeItem(LAST_ENROLLMENT_STEP);
        router.refresh();
        router.push('/dashboard');

        toast.success(result?.message || 'Information saved successfully', {
          position: 'top-right',
        });
      }

      return true;
    } catch (error) {
      // Check if error was due to abort
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was aborted');
        return false;
      }

      console.error('Error submitting step:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to submit: ${errorMessage}`);
      return false;
    }
  };

  return {
    submitStep,
  };
};

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
  createPlan,
  createPayment,
} from '@/features/enrollment/server/action';
import { ActionReturnType } from '@/types/actions';
import { UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { getSessions } from '@/server/actions/sessions';

/**
 * Validate that an object has meaningful data (not just empty object)
 */
const hasValidData = (obj: Record<string, unknown> | undefined): boolean => {
  if (!obj) return false;
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;

  // Check if at least one property has a truthy value (excluding clientId which is added later)
  return keys.some((key) => {
    if (key === 'clientId') return false;
    const value = obj[key];
    // Allow false boolean values, but not undefined/null/empty string
    return value !== undefined && value !== null && value !== '';
  });
};

/**
 * Format time from Date object to HH:MM string
 */
const formatTimeString = (date: Date): string => {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

/**
 * Format date to YYYY-MM-DD string
 */
const formatDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const useEnrollmentFormSubmissions = (
  getValues: UseFormGetValues<AdmissionFormValues>,
  setValue: UseFormSetValue<AdmissionFormValues>
) => {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleServiceTypeStep = useCallback(async (): ActionReturnType => {
    return Promise.resolve({
      error: false,
      message: 'Service type selected successfully',
    });
  }, []);

  const handlePersonalStep = useCallback(
    async (data: PersonalInfoValues): ActionReturnType => {
      const result = await createClient(data);

      // If the client was created successfully, store the clientId for later steps
      if (!result.error && result.clientId) {
        setValue('clientId', result.clientId);
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
      const clientId = getValues('clientId');

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
        if (learningResult && drivingResult) {
          return {
            error: false,
            message: 'Learning and driving licence information saved successfully',
          };
        } else if (learningResult) {
          return {
            error: false,
            message: 'Learning licence information saved successfully',
          };
        } else if (drivingResult) {
          return {
            error: false,
            message: 'Driving licence information saved successfully',
          };
        }

        // If no licenses were processed, allow progression (licenses are optional)
        return {
          error: false,
          message: 'Licence step completed',
        };
      } catch (error) {
        console.error('Error processing license data:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'An unexpected error occurred';
        return {
          error: true,
          message: `Failed to process licence data: ${errorMessage}`,
        };
      }
    },
    [getValues]
  );

  const handlePlanStep = useCallback(
    async (data: PlanValues): ActionReturnType => {
      const clientId = getValues('clientId');
      const serviceType = getValues('serviceType');

      // Validate client ID (not validated by Zod since it's added in the hook)
      if (!clientId) {
        return {
          error: true,
          message: 'Client ID not found. Please complete the personal information step first.',
        };
      }

      // Check slot availability before creating the plan
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
      const existingPlanId = getValues('plan.id') || getValues('planId') || undefined;

      // Create or update the plan
      try {
        const result = await createPlan({
          ...data,
          id: existingPlanId,
          serviceType: serviceType || data.serviceType,
          clientId,
        });

        // Update form state with plan ID if successful
        if (!result.error && result.planId) {
          setValue('planId', result.planId);
          setValue('plan.id', result.planId); // Also store in plan.id for consistency
        } else if (result.error) {
          console.error('Failed to create/update plan:', result.message);
        }

        return result;
      } catch (error) {
        console.error('Error creating/updating plan:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          error: true,
          message: `Failed to save plan: ${errorMessage}`,
        };
      }
    },
    [getValues, setValue]
  );

  const handlePaymentStep = useCallback(async (): ActionReturnType => {
    const formValues = getValues();

    if (!formValues.clientId || !formValues.planId)
      return {
        error: true,
        message: 'Payment information was not saved. Please try again later',
      };

    const paymentInput = {
      ...formValues.payment,
      clientId: formValues.clientId,
    };

    return await createPayment(paymentInput, formValues.planId);
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
      service: () => handleServiceTypeStep(),
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

      if (isLastStep) {
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
    handleServiceTypeStep,
    handlePersonalStep,
    handleLicenseStep,
    handlePlanStep,
    handlePaymentStep,
  };
};

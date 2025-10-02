import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCallback } from 'react';
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
} from '@/features/enrollment/server/action';
import { ActionReturnType } from '@/types/actions';
import { UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { getSessions } from '@/server/db/sessions';

export const useEnrollmentFormSubmissions = (
  getValues: UseFormGetValues<AdmissionFormValues>,
  setValue: UseFormSetValue<AdmissionFormValues>
) => {
  const router = useRouter();

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
        return Promise.resolve({
          error: true,
          message: 'An unexpected error occurred while processing licence data',
        });
      }
    },
    [getValues]
  );

  const handlePlanStep = useCallback(
    async (data: PlanValues): ActionReturnType => {
      const clientId = getValues('clientId');
      const serviceType = getValues('serviceType');

      if (!clientId) {
        return Promise.resolve({
          error: true,
          message: 'Client ID not found. Please complete the personal information step first.',
        });
      }

      // Check slot availability before creating the plan
      try {
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
        serviceType: serviceType || data.serviceType,
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

  const handlePaymentStep = useCallback(async () => {}, []);

  const submitStep = async (
    stepKey: string,
    stepData: unknown,
    isLastStep: boolean
  ): Promise<boolean> => {
    const stepHandlers = {
      service: () => handleServiceTypeStep(),
      personal: () => handlePersonalStep(stepData as PersonalInfoValues),
      license: () =>
        handleLicenseStep(
          stepData as {
            learningLicense?: LearningLicenseValues;
            drivingLicense?: DrivingLicenseValues;
          }
        ),
      plan: () => handlePlanStep(stepData as PlanValues),
      payment: () => handlePaymentStep(),
    };

    const handler = stepHandlers[stepKey as keyof typeof stepHandlers];

    if (!handler) {
      throw new Error(`Unknown step: ${stepKey}`);
    }

    const result = await handler();

    if (result?.error) {
      toast.error(result.message || 'Failed to save information');
      return false;
    } else {
      toast.success(result?.message || 'Information saved successfully', {
        position: 'top-right',
      });

      if (isLastStep) {
        router.refresh();
        router.push('/dashboard'); // Redirect to dashboard or another appropriate page
      }

      return true;
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

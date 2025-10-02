import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  PersonalInfoValues,
  PlanValues,
  LearningLicenseValues,
  DrivingLicenseValues,
} from '@/features/enrollment/types';
import {
  updateClient,
  createLearningLicense,
  createDrivingLicense,
  updateLearningLicense,
  updateDrivingLicense,
  updatePlan,
} from '@/features/enrollment/server/action';
import { ActionReturnType } from '@/types/actions';
import { Enrollment } from '@/server/db/plan';

export const useEditFormSubmissions = (enrollment: NonNullable<Enrollment>) => {
  const router = useRouter();

  const handlePersonalStep = useCallback(
    async (data: PersonalInfoValues): ActionReturnType => {
      return await updateClient(enrollment.client.id, data);
    },
    [enrollment.client.id]
  );

  const handleLicenseStep = useCallback(
    async (data: {
      learningLicense?: LearningLicenseValues;
      drivingLicense?: DrivingLicenseValues;
    }): ActionReturnType => {
      const { learningLicense, drivingLicense } = data;
      const hasLearningLicense = learningLicense && Object.keys(learningLicense).length > 0;
      const hasDrivingLicense = drivingLicense && Object.keys(drivingLicense).length > 0;

      try {
        let learningResult: Awaited<ActionReturnType> | null = null;
        let drivingResult: Awaited<ActionReturnType> | null = null;

        if (hasLearningLicense) {
          if (enrollment.client.learningLicense) {
            learningResult = await updateLearningLicense(enrollment.client.learningLicense.id, {
              ...learningLicense,
              clientId: enrollment.client.id,
            });
          } else {
            learningResult = await createLearningLicense({
              ...learningLicense,
              clientId: enrollment.client.id,
            });
          }

          if (learningResult.error) {
            return learningResult;
          }
        }

        const hasClass = learningLicense?.class && learningLicense.class.length > 0;
        if (hasDrivingLicense || hasClass) {
          if (enrollment.client.drivingLicense) {
            drivingResult = await updateDrivingLicense(enrollment.client.drivingLicense.id, {
              ...drivingLicense,
              class: learningLicense?.class || [],
              clientId: enrollment.client.id,
            });
          } else {
            drivingResult = await createDrivingLicense({
              ...drivingLicense,
              class: learningLicense?.class || [],
              clientId: enrollment.client.id,
            });
          }

          if (drivingResult.error) {
            return drivingResult;
          }
        }

        return {
          error: false,
          message: 'Licence information updated successfully',
        };
      } catch {
        return Promise.resolve({
          error: true,
          message: 'An unexpected error occurred while processing licence data',
        });
      }
    },
    [enrollment.client.id, enrollment.client.learningLicense, enrollment.client.drivingLicense]
  );

  const handlePlanStep = useCallback(
    async (data: PlanValues): ActionReturnType => {
      try {
        const result = await updatePlan(enrollment.id, {
          ...data,
          clientId: enrollment.client.id,
        });

        return result;
      } catch (error) {
        console.error('Error updating plan:', error);
        return Promise.resolve({
          error: true,
          message: 'Unable to update plan. Please try again.',
        });
      }
    },
    [enrollment.id, enrollment.client.id]
  );

  const handlePaymentStep = useCallback(async () => {}, []);

  const submitStep = useCallback(
    async (
      stepKey: string,
      stepData: unknown,
      isLastStep: boolean,
      shouldRefreshAfter: boolean = false
    ) => {
      const stepHandlers = {
        service: () => handlePersonalStep(stepData as PersonalInfoValues),
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

        if (shouldRefreshAfter) {
          router.refresh();
        }

        if (isLastStep) {
          router.push('/enrollments');
        }

        return true;
      }
    },
    [handlePersonalStep, handleLicenseStep, handlePlanStep, handlePaymentStep, router]
  );

  return {
    submitStep,
    handlePersonalStep,
    handleLicenseStep,
    handlePlanStep,
    handlePaymentStep,
  };
};

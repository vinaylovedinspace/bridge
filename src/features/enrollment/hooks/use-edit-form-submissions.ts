import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  PersonalInfoValues,
  PlanValues,
  LearningLicenseValues,
  DrivingLicenseValues,
  PaymentValues,
} from '@/features/enrollment/types';
import {
  updateClient,
  createLearningLicense,
  createDrivingLicense,
  updateLearningLicense,
  updateDrivingLicense,
  updatePlan,
  createPayment,
} from '@/features/enrollment/server/action';
import { ActionReturnType } from '@/types/actions';
import { Enrollment } from '@/server/db/plan';
import { hasValidData, getLicenseSuccessMessage, handleStepError } from './form-submission-utils';

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
      const hasLearningLicense = hasValidData(
        learningLicense as Record<string, unknown> | undefined
      );
      const hasDrivingLicense = hasValidData(drivingLicense as Record<string, unknown> | undefined);

      try {
        let learningResult: Awaited<ActionReturnType> | null = null;
        let drivingResult: Awaited<ActionReturnType> | null = null;

        if (hasLearningLicense && learningLicense) {
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
        if ((hasDrivingLicense || hasClass) && (drivingLicense || hasClass)) {
          if (enrollment.client.drivingLicense) {
            drivingResult = await updateDrivingLicense(enrollment.client.drivingLicense.id, {
              ...(drivingLicense || {}),
              class: learningLicense?.class || drivingLicense?.class || [],
              clientId: enrollment.client.id,
            });
          } else {
            drivingResult = await createDrivingLicense({
              ...(drivingLicense || {}),
              class: learningLicense?.class || drivingLicense?.class || [],
              clientId: enrollment.client.id,
            });
          }

          if (drivingResult.error) {
            return drivingResult;
          }
        }

        return {
          error: false,
          message: getLicenseSuccessMessage(!!learningResult, !!drivingResult, 'update'),
        };
      } catch (error) {
        return handleStepError(error, 'licence');
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

  const handlePaymentStep = useCallback(
    async (data: PaymentValues): ActionReturnType => {
      try {
        const paymentData = {
          ...data,
          clientId: enrollment.clientId,
        };
        const result = await createPayment(paymentData, enrollment.id);

        if (result.error) {
          return {
            error: true,
            message: result.message || 'Failed to save payment',
          };
        }

        return {
          error: false,
          message: enrollment.payment
            ? 'Payment updated successfully'
            : 'Payment created successfully',
        };
      } catch {
        return {
          error: true,
          message: 'Unable to save payment. Please try again.',
        };
      }
    },
    [enrollment.id, enrollment.clientId, enrollment.payment]
  );

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
        payment: () => handlePaymentStep(stepData as PaymentValues),
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

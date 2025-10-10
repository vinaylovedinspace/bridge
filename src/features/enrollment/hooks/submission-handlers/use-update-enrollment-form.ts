import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { UseFormGetValues } from 'react-hook-form';
import {
  PersonalInfoValues,
  PlanValues,
  LearningLicenseValues,
  DrivingLicenseValues,
  PaymentValues,
  AdmissionFormValues,
} from '@/features/enrollment/types';
import {
  updateClient,
  createLearningLicense,
  createDrivingLicense,
  updateLearningLicense,
  updateDrivingLicense,
  updatePayment,
  upsertPlanWithPayment,
} from '@/features/enrollment/server/action';
import { ActionReturnType } from '@/types/actions';
import { Enrollment } from '@/server/db/plan';

export const useUpdateEnrollmentForm = (
  enrollment: NonNullable<Enrollment>,
  getValues: UseFormGetValues<AdmissionFormValues>
) => {
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

      try {
        let learningResult: Awaited<ActionReturnType> | null = null;
        let drivingResult: Awaited<ActionReturnType> | null = null;

        if (learningLicense) {
          if (enrollment.client.learningLicense) {
            learningResult = await updateLearningLicense(
              enrollment.client.learningLicense.id,
              learningLicense
            );
          } else {
            learningResult = await createLearningLicense(learningLicense);
          }

          if (learningResult.error) {
            return learningResult;
          }
        }

        const hasClass = learningLicense?.class && learningLicense.class.length > 0;
        const hasDrivingLicense = !!drivingLicense;
        if ((hasDrivingLicense || hasClass) && (drivingLicense || hasClass)) {
          if (enrollment.client.drivingLicense) {
            drivingResult = await updateDrivingLicense(enrollment.client.drivingLicense.id, {
              ...drivingLicense,
              class: learningLicense?.class || drivingLicense?.class || [],
            });
          } else {
            drivingResult = await createDrivingLicense({
              ...drivingLicense,
              class: learningLicense?.class || drivingLicense?.class || [],
            });
          }

          if (drivingResult.error) {
            return drivingResult;
          }
        }

        return {
          error: false,
          message: 'License information updated successfully',
        };
      } catch (error) {
        console.error('Error updating license:', error);
        return {
          error: true,
          message: 'Failed to update license information',
        };
      }
    },
    [enrollment.client.learningLicense, enrollment.client.drivingLicense]
  );

  const handlePlanStep = useCallback(
    async (data: PlanValues): ActionReturnType => {
      try {
        // Ensure plan id is included for update operation
        const planData = {
          ...data,
          id: enrollment.id, // Explicitly set the plan id from enrollment
        };

        // Get current payment form values for recalculation
        const paymentFormData = getValues('payment');

        // Use upsertPlanWithPayment which handles both create and update
        const result = await upsertPlanWithPayment(planData, paymentFormData);
        return result;
      } catch (error) {
        console.error('Error updating plan:', error);
        return Promise.resolve({
          error: true,
          message: 'Unable to update plan. Please try again.',
        });
      }
    },
    [enrollment.id, getValues]
  );

  const handlePaymentStep = useCallback(
    async (data: PaymentValues): ActionReturnType => {
      try {
        const result = await updatePayment(data);

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
    [enrollment.payment]
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

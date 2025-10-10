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

        if (drivingLicense) {
          if (enrollment.client.drivingLicense) {
            drivingResult = await updateDrivingLicense(
              enrollment.client.drivingLicense.id,
              drivingLicense
            );
          } else {
            drivingResult = await createDrivingLicense(drivingLicense);
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
    [enrollment.client.drivingLicense, enrollment.client.learningLicense]
  );

  const handlePlanStep = useCallback(
    async (data: PlanValues): ActionReturnType => {
      try {
        // Get current payment form values for recalculation
        const paymentFormData = getValues('payment');

        // Use upsertPlanWithPayment which handles both create and update
        const result = await upsertPlanWithPayment(data, paymentFormData);
        return result;
      } catch (error) {
        console.error('Error updating plan:', error);
        return Promise.resolve({
          error: true,
          message: 'Unable to update plan. Please try again.',
        });
      }
    },
    [getValues]
  );

  const handlePaymentStep = useCallback(async (data: PaymentValues): ActionReturnType => {
    try {
      const result = await updatePayment(data);

      return result;
    } catch {
      return {
        error: true,
        message: 'Unable to save payment. Please try again.',
      };
    }
  }, []);

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

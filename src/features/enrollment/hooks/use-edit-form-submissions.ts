import { useRouter } from 'next/navigation';
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
  createPayment,
  updateLearningLicense,
  updateDrivingLicense,
  updatePlan,
  updatePayment,
} from '@/features/enrollment/server/action';
import { ActionReturnType } from '@/types/actions';
import { Enrollment } from '@/server/db/plan';

export const useEditFormSubmissions = (enrollment: NonNullable<Enrollment>) => {
  const router = useRouter();

  const handlePersonalStep = async (data: PersonalInfoValues): ActionReturnType => {
    return await updateClient(enrollment.client.id, data);
  };

  const handleLicenseStep = async (data: {
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
  };

  const handlePlanStep = async (data: PlanValues): ActionReturnType => {
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
  };

  const handlePaymentStep = async (data: PaymentValues): ActionReturnType => {
    console.log('Client-side payment data being submitted:', JSON.stringify(data, null, 2));

    const { payment } = enrollment;
    const isPaymentProcessed =
      payment?.paymentStatus === 'FULLY_PAID' || payment?.paymentStatus === 'PARTIALLY_PAID';

    if (isPaymentProcessed) {
      return Promise.resolve({
        error: true,
        message: 'Payment has already been processed and cannot be modified.',
      });
    }

    try {
      let result;
      const planId = enrollment.id;

      if (!planId) {
        return Promise.resolve({
          error: true,
          message: 'Plan not found. Please complete the plan step first.',
        });
      }

      if (payment) {
        result = await updatePayment(payment.id, {
          ...data,
          clientId: enrollment.client.id,
          planId,
        });
      } else {
        result = await createPayment({
          ...data,
          clientId: enrollment.client.id,
          planId,
        });
      }

      return result;
    } catch (error) {
      console.error('Error updating payment:', error);
      return Promise.resolve({
        error: true,
        message: 'Unable to update payment. Please try again.',
      });
    }
  };

  const submitStep = async (
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

    if (result.error) {
      toast.error(result.message || 'Failed to save information');
      return false;
    } else {
      toast.success(result.message || 'Information saved successfully', {
        position: 'top-right',
      });

      if (shouldRefreshAfter) {
        router.refresh();
      }

      if (isLastStep) {
        router.push('/clients');
      }

      return true;
    }
  };

  return {
    submitStep,
    handlePersonalStep,
    handleLicenseStep,
    handlePlanStep,
    handlePaymentStep,
  };
};

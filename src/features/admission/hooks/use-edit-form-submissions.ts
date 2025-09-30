import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  PersonalInfoValues,
  PlanValues,
  LearningLicenseValues,
  DrivingLicenseValues,
  PaymentValues,
} from '@/features/admission/types';
import {
  updateClient,
  createLearningLicense,
  createDrivingLicense,
  createPlan,
  createPayment,
  updateLearningLicense,
  updateDrivingLicense,
  updatePlan,
  updatePayment,
} from '@/features/admission/server/action';
import { ActionReturnType } from '@/types/actions';
import { ClientDetail } from '@/server/db/client';

export const useEditFormSubmissions = (client: NonNullable<ClientDetail>) => {
  const router = useRouter();

  const handlePersonalStep = async (data: PersonalInfoValues): ActionReturnType => {
    return await updateClient(client.id, data);
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
        if (client.learningLicense) {
          learningResult = await updateLearningLicense(client.learningLicense.id, {
            ...learningLicense,
            clientId: client.id,
          });
        } else {
          learningResult = await createLearningLicense({
            ...learningLicense,
            clientId: client.id,
          });
        }

        if (learningResult.error) {
          return learningResult;
        }
      }

      const hasClass = learningLicense?.class && learningLicense.class.length > 0;
      if (hasDrivingLicense || hasClass) {
        if (client.drivingLicense) {
          drivingResult = await updateDrivingLicense(client.drivingLicense.id, {
            ...drivingLicense,
            class: learningLicense?.class || [],
            clientId: client.id,
          });
        } else {
          drivingResult = await createDrivingLicense({
            ...drivingLicense,
            class: learningLicense?.class || [],
            clientId: client.id,
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
    } catch {
      return Promise.resolve({
        error: true,
        message: 'An unexpected error occurred while processing license data',
      });
    }
  };

  const handlePlanStep = async (data: PlanValues): ActionReturnType => {
    try {
      let result;

      if (client.plan?.[0]) {
        result = await updatePlan(client.plan[0].id, {
          ...data,
          clientId: client.id,
        });
      } else {
        result = await createPlan({
          ...data,
          clientId: client.id,
        });
      }

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

    const payment = client.plan?.[0]?.payment;
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
      const planId = client.plan?.[0]?.id;

      if (!planId) {
        return Promise.resolve({
          error: true,
          message: 'Plan not found. Please complete the plan step first.',
        });
      }

      if (payment) {
        result = await updatePayment(payment.id, {
          ...data,
          clientId: client.id,
          planId,
        });
      } else {
        result = await createPayment({
          ...data,
          clientId: client.id,
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

import { toast } from 'sonner';
import { useCallback } from 'react';
import { UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import {
  PersonalInfoValues,
  PlanValues,
  LearningLicenseValues,
  DrivingLicenseValues,
  AdmissionFormValues,
  AdmissionFormStepKey,
  PaymentValues,
} from '@/features/enrollment/types';
import {
  upsertClient,
  upsertLearningLicense,
  upsertDrivingLicense,
  upsertPlanWithPayment,
} from '@/features/enrollment/server/action';
import { ActionReturnType } from '@/types/actions';
import { LAST_ENROLLMENT_CLIENT_ID, LAST_ENROLLMENT_STEP } from '@/lib/constants/business';
import { upsertPaymentWithOptionalTransaction } from '@/server/action/payments';
import { Enrollment } from '@/server/db/plan';

type UpsertEnrollmentFormParams = {
  enrollment?: NonNullable<Enrollment>;
  getValues: UseFormGetValues<AdmissionFormValues>;
  setValue: UseFormSetValue<AdmissionFormValues>;
};

export const useUpsertEnrollmentForm = ({
  enrollment,
  getValues,
  setValue,
}: UpsertEnrollmentFormParams) => {
  const isEditMode = !!enrollment;

  const handlePersonalStep = useCallback(
    async (data: PersonalInfoValues): ActionReturnType => {
      const result = await upsertClient(data);

      // In create mode, store clientId for later steps
      if (!isEditMode && setValue && result.clientId) {
        setValue('client.id', result.clientId);
        setValue('plan.clientId', result.clientId);
        setValue('learningLicense.clientId', result.clientId);
        setValue('drivingLicense.clientId', result.clientId);
        setValue('payment.clientId', result.clientId);
      }

      return result.error
        ? { error: true, message: result.message }
        : { error: false, message: isEditMode ? 'Client updated successfully' : result.message };
    },
    [isEditMode, setValue]
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

      try {
        // Handle learning license if present
        if (learningLicense) {
          const learningResult = await upsertLearningLicense(learningLicense);
          if (learningResult.error) {
            return learningResult;
          }
        }

        // Handle driving license if present
        if (drivingLicense) {
          const drivingResult = await upsertDrivingLicense(drivingLicense);
          if (drivingResult.error) {
            return drivingResult;
          }
        }

        return {
          error: false,
          message: isEditMode ? 'License information updated successfully' : 'success',
        };
      } catch {
        return {
          error: true,
          message: 'Failed to save license information',
        };
      }
    },
    [getValues, isEditMode]
  );

  const handlePlanStep = useCallback(
    async (data: PlanValues): ActionReturnType => {
      try {
        const existingPlanId = getValues('plan.id');
        const serviceType = getValues('serviceType');

        const planInput = {
          ...data,
          id: existingPlanId,
          serviceType: serviceType || data.serviceType,
        };

        const paymentInput = getValues('payment');

        const result = await upsertPlanWithPayment(planInput, paymentInput);

        // Update form state on success (only needed in create mode)
        if (!result.error) {
          setValue('plan.id', result.planId);
          setValue('payment.id', result.paymentId);
        }

        return result.error
          ? { error: true, message: result.message }
          : { error: false, message: 'Plan details validated successfully' };
      } catch {
        return {
          error: true,
          message: 'Failed to save plan information',
        };
      }
    },
    [getValues, setValue]
  );

  const handlePaymentStep = useCallback(async (data: PaymentValues): ActionReturnType => {
    return await upsertPaymentWithOptionalTransaction({
      payment: data,
    });
  }, []);

  const submitStep = async ({
    currentStep,
    stepData,
    isLastStep,
  }: {
    currentStep: AdmissionFormStepKey;
    stepData: unknown;
    isLastStep?: boolean;
  }): Promise<boolean> => {
    const stepHandlers: Record<
      AdmissionFormStepKey,
      () => Promise<{ error: boolean; message: string }>
    > = {
      service: () => {
        return Promise.resolve({ error: false, message: 'Service details validated successfully' });
      },
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

    const handler = stepHandlers[currentStep];

    try {
      const result = await handler();

      if (result?.error) {
        toast.error(result.message || 'Failed to save information');
        return false;
      }

      // Only manage localStorage in create mode
      if (!isEditMode) {
        localStorage.setItem(LAST_ENROLLMENT_CLIENT_ID, JSON.stringify(getValues('client.id')));

        if (isLastStep) {
          localStorage.removeItem(LAST_ENROLLMENT_CLIENT_ID);
          localStorage.removeItem(LAST_ENROLLMENT_STEP);
        }
      }

      // Show success toast for edit mode (create mode shows it only on last step)
      if (isLastStep) {
        if (isEditMode) {
          toast.success('Information updated successfully', {
            position: 'top-center',
          });
        } else {
          toast.success('Admission completed successfully!', {
            position: 'top-center',
          });
        }
      }

      return true;
    } catch {
      return false;
    }
  };

  return {
    submitStep,
  };
};

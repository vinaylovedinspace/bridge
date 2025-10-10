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
  upsertPlanWithPayment,
  updatePayment,
} from '@/features/enrollment/server/action';
import { ActionReturnType } from '@/types/actions';
import { UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { LAST_ENROLLMENT_CLIENT_ID, LAST_ENROLLMENT_STEP } from '@/lib/constants/business';

export const useCreateEnrollmentForm = (
  getValues: UseFormGetValues<AdmissionFormValues>,
  setValue: UseFormSetValue<AdmissionFormValues>
) => {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);

  const handlePersonalStep = useCallback(
    async (data: PersonalInfoValues): ActionReturnType => {
      const { clientId } = await createClient(data);

      // If the client was created successfully, store the clientId for later steps
      if (clientId) {
        setValue('client.id', clientId);
        setValue('plan.clientId', clientId);
        setValue('learningLicense.clientId', clientId);
        setValue('drivingLicense.clientId', clientId);
        setValue('payment.clientId', clientId);
      } else {
        return {
          error: true,
          message: 'Failed to create client. Please try again.',
        };
      }

      return {
        error: false,
        message: 'Client created successfully',
      };
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

      try {
        let learningResult: Awaited<ActionReturnType> | null = null;
        let drivingResult: Awaited<ActionReturnType> | null = null;

        // Handle learning license if present
        if (learningLicense) {
          learningResult = await createLearningLicense(learningLicense);

          // If learning license fails, return the learning result
          if (learningResult.error) {
            console.error('Failed to create learning license:', learningResult.message);
            return learningResult;
          }
        }

        // Handle driving license if present
        if (drivingLicense) {
          drivingResult = await createDrivingLicense(drivingLicense);

          // If driving license fails, return its error
          if (drivingResult.error) {
            console.error('Failed to create driving license:', drivingResult.message);
            return drivingResult;
          }
        }

        // Return success message based on what was processed
        return {
          error: false,
          message: 'success',
        };
      } catch {
        return {
          error: true,
          message: 'Failed to create/update license',
        };
      }
    },
    [getValues]
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

        // 2. Create plan with payment
        const result = await upsertPlanWithPayment(planInput, paymentInput);

        // 3. Update form state on success
        if (!result.error) {
          setValue('plan.id', result.planId);
          setValue('payment.id', result.paymentId);
        } else {
          console.error('Failed to create/update plan:', result.message);
          return {
            error: true,
            message: 'Failed to create/update plan',
          };
        }

        return {
          error: false,
          message: 'Plan details validated successfully',
        };
      } catch {
        return {
          error: true,
          message: 'Failed to create/update plan',
        };
      }
    },
    [getValues, setValue]
  );

  const handlePaymentStep = useCallback(async (): ActionReturnType => {
    const formValues = getValues();

    if (!formValues.client.id)
      return {
        error: true,
        message: 'Payment information was not saved. Please try again later',
      };

    return await updatePayment(formValues.payment);
  }, [getValues]);

  const submitStep = async (
    stepKey: string,
    stepData: unknown,
    isLastStep: boolean
  ): Promise<boolean> => {
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

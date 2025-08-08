'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useForm, FormProvider, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import {
  PersonalInfoValues,
  PlanValues,
  LearningLicenseValues,
  DrivingLicenseValues,
  PaymentValues,
  admissionFormSchema,
} from '@/features/admission/types';
import { z } from 'zod';

type ClientFormValues = z.infer<typeof admissionFormSchema>;
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PersonalInfoStep } from '@/features/admission/components/form/steps/personal-info';
import { LicenseStep } from '@/features/admission/components/form/steps/license';
import { PlanStep } from '@/features/admission/components/form/steps/plan';
import { ServiceTypeStep } from '@/features/admission/components/form/steps/service-type';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useStepNavigation,
  ProgressBar,
  ADMISSION_STEPS,
} from '@/features/admission/components/progress-bar/progress-bar';
import { ActionReturnType } from '@/types/actions';
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
import { PaymentSummary } from './payment-summary';
import { ClientPaymentContainer } from './client-payment-container';
import { ClientDetail } from '@/server/db/client';
import { parseDate } from '@/lib/date-utils';

type ClientAdmissionFormProps = {
  client: NonNullable<ClientDetail>;
  branchConfig: {
    workingDays: number[];
    operatingHours: { start: string; end: string };
  };
};

export const ClientAdmissionForm = ({ client, branchConfig }: ClientAdmissionFormProps) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-populate form with existing client data
  const getDefaultValues = (): ClientFormValues => {
    return {
      personalInfo: {
        firstName: client.firstName,
        middleName: client.middleName || '',
        lastName: client.lastName,
        clientCode: client.clientCode,
        aadhaarNumber: client.aadhaarNumber || '',
        panNumber: client.panNumber || '',
        photoUrl: client.photoUrl || '',
        signatureUrl: client.signatureUrl || '',
        guardianFirstName: client.guardianFirstName || '',
        guardianMiddleName: client.guardianMiddleName || '',
        guardianLastName: client.guardianLastName || '',
        birthDate:
          typeof client.birthDate === 'string' ? new Date(client.birthDate) : client.birthDate,
        bloodGroup: client.bloodGroup,
        gender: client.gender,
        educationalQualification: client.educationalQualification || 'BELOW_10TH',
        phoneNumber: client.phoneNumber,
        alternativePhoneNumber: client.alternativePhoneNumber || '',
        email: client.email || '',
        address: client.address,
        city: client.city,
        state: client.state,
        pincode: client.pincode,
        isCurrentAddressSameAsPermanentAddress:
          client.isCurrentAddressSameAsPermanentAddress || false,
        permanentAddress: client.permanentAddress,
        permanentCity: client.permanentCity,
        permanentState: client.permanentState,
        permanentPincode: client.permanentPincode,
        citizenStatus: client.citizenStatus || 'BIRTH',
        serviceType: client.serviceType || 'FULL_SERVICE',
        branchId: client.branchId,
        tenantId: client.tenantId,
      },
      learningLicense: client.learningLicense
        ? {
            class: client.learningLicense.class || [],
            licenseNumber: client.learningLicense.licenseNumber || '',
            issueDate: client.learningLicense.issueDate
              ? typeof client.learningLicense.issueDate === 'string'
                ? new Date(client.learningLicense.issueDate)
                : client.learningLicense.issueDate
              : null,
            expiryDate: client.learningLicense.expiryDate
              ? typeof client.learningLicense.expiryDate === 'string'
                ? new Date(client.learningLicense.expiryDate)
                : client.learningLicense.expiryDate
              : null,
          }
        : undefined,
      drivingLicense: client.drivingLicense
        ? {
            class: client.drivingLicense.class || [],
            licenseNumber: client.drivingLicense.licenseNumber || '',
            issueDate: client.drivingLicense.issueDate
              ? typeof client.drivingLicense.issueDate === 'string'
                ? new Date(client.drivingLicense.issueDate)
                : client.drivingLicense.issueDate
              : null,
            expiryDate: client.drivingLicense.expiryDate
              ? typeof client.drivingLicense.expiryDate === 'string'
                ? new Date(client.drivingLicense.expiryDate)
                : client.drivingLicense.expiryDate
              : null,
            appointmentDate: client.drivingLicense.appointmentDate
              ? typeof client.drivingLicense.appointmentDate === 'string'
                ? new Date(client.drivingLicense.appointmentDate)
                : client.drivingLicense.appointmentDate
              : null,
          }
        : undefined,
      plan: {
        clientId: client.id,
        vehicleId: client.plan?.[0]?.vehicleId || '',
        numberOfSessions: client.plan?.[0]?.numberOfSessions || 21,
        sessionDurationInMinutes: client.plan?.[0]?.sessionDurationInMinutes || 30,
        joiningDate: (() => {
          const plan = client.plan?.[0];
          if (plan?.joiningDate && plan?.joiningTime) {
            // Parse date using utility function (handles all formats)
            const savedDate = parseDate(plan.joiningDate);
            if (savedDate && savedDate instanceof Date && !isNaN(savedDate.getTime())) {
              const [hours, minutes] = plan.joiningTime.split(':').map(Number);

              // Create combined date with time components
              const combinedDate = new Date(
                savedDate.getFullYear(),
                savedDate.getMonth(),
                savedDate.getDate(),
                hours,
                minutes,
                0,
                0
              );
              return combinedDate;
            }
          }
          return new Date();
        })(),
        joiningTime: client.plan?.[0]?.joiningTime || '09:00',
      },
      payment: {
        clientId: client.id,
        planId: client.plan?.[0]?.id || '',
        originalAmount: client.payments?.[0]?.originalAmount || 0,
        discount: client.payments?.[0]?.discount || 0,
        finalAmount: client.payments?.[0]?.finalAmount || 0,
        paymentStatus: client.payments?.[0]?.paymentStatus || 'PENDING',
        paymentType: client.payments?.[0]?.paymentType || 'FULL_PAYMENT',
        fullPaymentDate: client.payments?.[0]?.fullPaymentDate || null,
        fullPaymentMode: client.payments?.[0]?.fullPaymentMode || 'PAYMENT_LINK',
        firstInstallmentAmount: client.payments?.[0]?.firstInstallmentAmount || null,
        firstInstallmentDate: client.payments?.[0]?.firstInstallmentDate || null,
        firstPaymentMode: client.payments?.[0]?.firstPaymentMode || 'PAYMENT_LINK',
        secondInstallmentAmount: client.payments?.[0]?.secondInstallmentAmount || null,
        secondInstallmentDate: client.payments?.[0]?.secondInstallmentDate || null,
        secondPaymentMode: client.payments?.[0]?.secondPaymentMode || 'PAYMENT_LINK',
        paymentDueDate: client.payments?.[0]?.paymentDueDate || null,
      },
    };
  };

  const methods = useForm<ClientFormValues>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: getDefaultValues(),
    mode: 'onChange',
  });

  const { trigger, getValues, reset, watch } = methods;
  const { currentStep, goToNext, goToPrevious, isFirstStep, isLastStep, goToStep } =
    useStepNavigation(ADMISSION_STEPS, 'service', true);

  // Unsaved changes confirmation dialog
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [pendingStepNavigation, setPendingStepNavigation] = useState<StepKey | null>(null);

  // Watch all form values to detect changes
  const watchedValues = watch();

  // Check if payment is processed and should be read-only
  const isPaymentProcessed =
    client.payments?.[0]?.paymentStatus === 'FULLY_PAID' ||
    client.payments?.[0]?.paymentStatus === 'PARTIALLY_PAID';
  const isPaymentStep = currentStep === 'payment';
  const shouldDisablePaymentEdit = isPaymentStep && isPaymentProcessed;

  // Helper function to generate field paths from type
  const generateFieldPaths = (
    prefix: keyof ClientFormValues,
    excludeFields: string[] = []
  ): Path<ClientFormValues>[] => {
    const value = getValues(prefix);
    const fields = value ? Object.keys(value) : [];

    return fields
      .filter((field) => !excludeFields.includes(field))
      .map((field) => `${String(prefix)}.${field}` as Path<ClientFormValues>);
  };

  // Define step actions for updates
  const handlePersonalStep = async (data: PersonalInfoValues): ActionReturnType => {
    console.log('Updating personal info:', data);
    const result = await updateClient(client.id, data);
    return result;
  };

  const handleLicenseStep = async (data: {
    learningLicense?: LearningLicenseValues;
    drivingLicense?: DrivingLicenseValues;
  }): ActionReturnType => {
    console.log('Processing license info:', JSON.stringify(data, null, 2));

    const { learningLicense, drivingLicense } = data;
    const hasLearningLicense = learningLicense && Object.keys(learningLicense).length > 0;
    const hasDrivingLicense = drivingLicense && Object.keys(drivingLicense).length > 0;

    try {
      let learningResult: Awaited<ActionReturnType> | null = null;
      let drivingResult: Awaited<ActionReturnType> | null = null;

      // Handle learning license
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

      // Handle driving license
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
    } catch (error) {
      console.error('Error processing license data:', error);
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

    // If payment is already processed, don't allow updates
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

      if (client.payments?.[0]) {
        result = await updatePayment(client.payments[0].id, {
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

  // Map step keys to components and their corresponding actions
  const stepComponents = {
    service: {
      component: <ServiceTypeStep disabled={true} />,
      onSubmit: (data: unknown) => handlePersonalStep(data as PersonalInfoValues),
      getData: () => ({ serviceType: getValues('personalInfo.serviceType') }),
    },
    personal: {
      component: <PersonalInfoStep />,
      onSubmit: (data: unknown) => handlePersonalStep(data as PersonalInfoValues),
      getData: () => getValues('personalInfo'),
    },
    license: {
      component: <LicenseStep isEditMode={true} />,
      onSubmit: (data: unknown) =>
        handleLicenseStep(
          data as { learningLicense?: LearningLicenseValues; drivingLicense?: DrivingLicenseValues }
        ),
      getData: () => ({
        learningLicense: getValues('learningLicense'),
        drivingLicense: getValues('drivingLicense'),
      }),
    },
    plan: {
      component: <PlanStep branchConfig={branchConfig} currentClientId={client.id} />,
      onSubmit: (data: unknown) => handlePlanStep(data as PlanValues),
      getData: () => getValues('plan'),
    },
    payment: {
      component: isPaymentProcessed ? (
        client.payments?.[0] ? (
          <PaymentSummary
            payment={{
              ...client.payments[0],
              paymentStatus: client.payments[0].paymentStatus || 'PENDING',
              paymentType: client.payments[0].paymentType || 'FULL_PAYMENT',
              fullPaymentDate: client.payments[0].fullPaymentDate
                ? new Date(client.payments[0].fullPaymentDate)
                : null,
              firstInstallmentDate: client.payments[0].firstInstallmentDate
                ? new Date(client.payments[0].firstInstallmentDate)
                : null,
              secondInstallmentDate: client.payments[0].secondInstallmentDate
                ? new Date(client.payments[0].secondInstallmentDate)
                : null,
              paymentDueDate: client.payments[0].paymentDueDate
                ? new Date(client.payments[0].paymentDueDate)
                : null,
              fullPaymentPaid: client.payments[0].fullPaymentPaid || false,
              firstInstallmentPaid: client.payments[0].firstInstallmentPaid || false,
              secondInstallmentPaid: client.payments[0].secondInstallmentPaid || false,
            }}
          />
        ) : (
          <ClientPaymentContainer existingPayment={client.payments?.[0] || null} />
        )
      ) : (
        <ClientPaymentContainer existingPayment={client.payments?.[0] || null} />
      ),
      onSubmit: (data: unknown) => handlePaymentStep(data as PaymentValues),
      getData: () => getValues('payment'),
    },
  } as const;

  type StepKey = keyof typeof stepComponents;

  const getStepValidationFields = (step: StepKey): Path<ClientFormValues>[] => {
    switch (step) {
      case 'service':
        return ['personalInfo.serviceType' as Path<ClientFormValues>];
      case 'personal':
        return generateFieldPaths('personalInfo');
      case 'license':
        return [...generateFieldPaths('learningLicense'), ...generateFieldPaths('drivingLicense')];
      case 'plan':
        return generateFieldPaths('plan');
      case 'payment':
        return generateFieldPaths('payment');
      default:
        return [];
    }
  };

  const handleNext = async () => {
    try {
      const currentStepKey = currentStep as StepKey;
      const fieldsToValidate = getStepValidationFields(currentStepKey);

      const isStepValid = await trigger(fieldsToValidate);

      if (!isStepValid) {
        return;
      }

      // Check if there are any changes in the current step
      const hasChanges = hasCurrentStepChanges();

      if (!hasChanges) {
        // If no changes, just proceed to next step without submitting
        console.log('No changes detected, skipping submission');
        if (isLastStep) {
          router.push('/clients');
        } else {
          goToNext();
        }
        return;
      }

      setIsSubmitting(true);
      try {
        const stepData = stepComponents[currentStepKey].getData();
        const result = await stepComponents[currentStepKey].onSubmit(stepData);

        if (result.error) {
          toast.error(result.message || 'Failed to save information');
        } else {
          toast.success(result.message || 'Information saved successfully', {
            position: 'top-right',
          });

          // Refresh page data for plan and payment steps to get updated data
          if (currentStepKey === 'plan' || currentStepKey === 'payment') {
            router.refresh();
          }

          if (isLastStep) {
            router.push('/clients');
          } else {
            goToNext();
          }
        }
      } catch (error) {
        console.error('Error in step submission:', error);
        toast.error('An unexpected error occurred');
      } finally {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error(`Error in step ${currentStep}:`, error);
      toast.error('An error occurred while processing your information');
    }
  };

  // Check if current step has any changes compared to original values
  const hasCurrentStepChanges = (): boolean => {
    const originalValues = getDefaultValues();
    const currentStepKey = currentStep as StepKey;

    const getCurrentStepValues = () => {
      switch (currentStepKey) {
        case 'service':
          return { serviceType: watchedValues.personalInfo?.serviceType };
        case 'personal':
          return watchedValues.personalInfo;
        case 'license':
          return {
            learningLicense: watchedValues.learningLicense,
            drivingLicense: watchedValues.drivingLicense,
          };
        case 'plan':
          return watchedValues.plan;
        case 'payment':
          return watchedValues.payment;
        default:
          return {};
      }
    };

    const getOriginalStepValues = () => {
      switch (currentStepKey) {
        case 'service':
          return { serviceType: originalValues.personalInfo.serviceType };
        case 'personal':
          return originalValues.personalInfo;
        case 'license':
          return {
            learningLicense: originalValues.learningLicense,
            drivingLicense: originalValues.drivingLicense,
          };
        case 'plan':
          return originalValues.plan;
        case 'payment':
          return originalValues.payment;
        default:
          return {};
      }
    };

    const currentValues = getCurrentStepValues();
    const originalStepValues = getOriginalStepValues();

    return JSON.stringify(currentValues) !== JSON.stringify(originalStepValues);
  };

  const handleDiscardChanges = () => {
    reset(getDefaultValues());
    toast.success('Changes discarded successfully');
  };

  // Handle step navigation with unsaved changes check
  const handleStepNavigation = async (targetStep: StepKey): Promise<boolean> => {
    if (targetStep === currentStep) return true; // Same step, no navigation needed

    const hasChanges = hasCurrentStepChanges();

    if (hasChanges) {
      setPendingStepNavigation(targetStep);
      setShowUnsavedChangesDialog(true);
      return false; // Prevent navigation for now
    }

    return true; // Allow navigation
  };

  // Handle confirmation dialog actions
  const handleConfirmNavigation = () => {
    // Reset the current step's data to original values before navigating
    const originalValues = getDefaultValues();
    const currentStepKey = currentStep as StepKey;

    switch (currentStepKey) {
      case 'service':
        reset({
          ...getValues(),
          personalInfo: {
            ...getValues('personalInfo'),
            serviceType: originalValues.personalInfo.serviceType,
          },
        });
        break;
      case 'personal':
        reset({
          ...getValues(),
          personalInfo: originalValues.personalInfo,
        });
        break;
      case 'license':
        reset({
          ...getValues(),
          learningLicense: originalValues.learningLicense,
          drivingLicense: originalValues.drivingLicense,
        });
        break;
      case 'plan':
        reset({
          ...getValues(),
          plan: originalValues.plan,
        });
        break;
      case 'payment':
        reset({
          ...getValues(),
          payment: originalValues.payment,
        });
        break;
    }

    toast.success('Changes discarded successfully');

    if (pendingStepNavigation) {
      goToStep(pendingStepNavigation);
    }
    setShowUnsavedChangesDialog(false);
    setPendingStepNavigation(null);
  };

  const handleCancelNavigation = () => {
    setShowUnsavedChangesDialog(false);
    setPendingStepNavigation(null);
  };

  return (
    <FormProvider {...methods}>
      <div className="h-full flex flex-col py-2 gap-4">
        {/* Progress Bar */}
        <ProgressBar
          steps={ADMISSION_STEPS}
          defaultStep="service"
          interactive={true}
          onStepClick={handleStepNavigation}
        />

        <ScrollArea className="h-[calc(100vh-20rem)] pr-10">
          <form className="space-y-8 pb-24">
            {stepComponents[currentStep as StepKey].component}
          </form>
        </ScrollArea>

        <div className="bg-white py-4 px-6 border-t flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={goToPrevious}
            disabled={isFirstStep || isSubmitting}
          >
            Previous
          </Button>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleDiscardChanges}
              disabled={isSubmitting || !hasCurrentStepChanges()}
            >
              Discard Changes
            </Button>

            <Button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting || shouldDisablePaymentEdit}
              isLoading={isSubmitting}
            >
              {shouldDisablePaymentEdit
                ? 'Payment Processed'
                : isLastStep
                  ? 'Save Changes'
                  : 'Next'}
            </Button>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Confirmation Dialog */}
      <Dialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes in the current step. Are you sure you want to navigate away?
              Your changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelNavigation}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmNavigation}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormProvider>
  );
};

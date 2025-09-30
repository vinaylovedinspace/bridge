import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { ClientDetail } from '@/server/db/client';
import { AdmissionFormStepKey } from '@/features/admission/components/progress-bar/progress-bar';
import { ClientFormValues, transformClientToFormData } from '../lib/utils';

export const useUnsavedChanges = (
  client: NonNullable<ClientDetail>,
  methods: UseFormReturn<ClientFormValues>,
  currentStep: string
) => {
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [pendingStepNavigation, setPendingStepNavigation] = useState<AdmissionFormStepKey | null>(
    null
  );

  const { reset, getValues, watch } = methods;
  const watchedValues = watch();
  const originalValues = transformClientToFormData(client);

  const getCurrentStepValues = (stepKey: AdmissionFormStepKey) => {
    switch (stepKey) {
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

  const getOriginalStepValues = (stepKey: AdmissionFormStepKey) => {
    switch (stepKey) {
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

  const hasCurrentStepChanges = (): boolean => {
    const currentStepKey = currentStep as AdmissionFormStepKey;
    const currentValues = getCurrentStepValues(currentStepKey);
    const originalStepValues = getOriginalStepValues(currentStepKey);

    return JSON.stringify(currentValues) !== JSON.stringify(originalStepValues);
  };

  const handleDiscardChanges = () => {
    reset(originalValues);
    toast.success('Changes discarded successfully');
  };

  const resetCurrentStepToOriginal = () => {
    const currentStepKey = currentStep as AdmissionFormStepKey;

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
  };

  const handleStepNavigation = async (targetStep: AdmissionFormStepKey): Promise<boolean> => {
    if (targetStep === currentStep) return true;

    const hasChanges = hasCurrentStepChanges();

    if (hasChanges) {
      setPendingStepNavigation(targetStep);
      setShowUnsavedChangesDialog(true);
      return false;
    }

    return true;
  };

  const handleConfirmNavigation = (goToStep: (step: AdmissionFormStepKey) => void) => {
    resetCurrentStepToOriginal();
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

  return {
    showUnsavedChangesDialog,
    setShowUnsavedChangesDialog,
    pendingStepNavigation,
    hasCurrentStepChanges,
    handleDiscardChanges,
    handleStepNavigation,
    handleConfirmNavigation,
    handleCancelNavigation,
  };
};

import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { ClientDetailStepKey } from '../components/detail/progress-bar';
import { ClientDetailFormValues } from '../types/client-detail';

export const useUnsavedChanges = (
  methods: UseFormReturn<ClientDetailFormValues>,
  currentStep: string,
  defaultValues: ClientDetailFormValues
) => {
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [pendingStepNavigation, setPendingStepNavigation] = useState<ClientDetailStepKey | null>(
    null
  );

  const { reset, watch } = methods;
  const watchedValues = watch();

  const getCurrentStepValues = (stepKey: ClientDetailStepKey) => {
    switch (stepKey) {
      case 'personal':
        return watchedValues.personalInfo;
      case 'license':
        return {
          learningLicense: watchedValues.learningLicense,
          drivingLicense: watchedValues.drivingLicense,
        };
      default:
        return {};
    }
  };

  const getOriginalStepValues = (stepKey: ClientDetailStepKey) => {
    switch (stepKey) {
      case 'personal':
        return defaultValues.personalInfo;
      case 'license':
        return {
          learningLicense: defaultValues.learningLicense,
          drivingLicense: defaultValues.drivingLicense,
        };
      default:
        return {};
    }
  };

  const hasCurrentStepChanges = (): boolean => {
    const currentStepKey = currentStep as ClientDetailStepKey;
    const currentValues = getCurrentStepValues(currentStepKey);
    const originalStepValues = getOriginalStepValues(currentStepKey);

    return JSON.stringify(currentValues) !== JSON.stringify(originalStepValues);
  };

  const handleDiscardChanges = () => {
    reset(defaultValues);
    toast.success('Changes discarded successfully');
  };

  const resetCurrentStepToOriginal = () => {
    const currentStepKey = currentStep as ClientDetailStepKey;

    switch (currentStepKey) {
      case 'personal':
        reset({
          ...watchedValues,
          personalInfo: defaultValues.personalInfo,
        });
        break;
      case 'license':
        reset({
          ...watchedValues,
          learningLicense: defaultValues.learningLicense,
          drivingLicense: defaultValues.drivingLicense,
        });
        break;
    }
  };

  const handleStepNavigation = async (targetStep: ClientDetailStepKey): Promise<boolean> => {
    if (targetStep === currentStep) return true;

    const hasChanges = hasCurrentStepChanges();

    if (hasChanges) {
      setPendingStepNavigation(targetStep);
      setShowUnsavedChangesDialog(true);
      return false;
    }

    return true;
  };

  const handleConfirmNavigation = (goToStep: (step: ClientDetailStepKey) => void) => {
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

'use client';

import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import SchoolNameStep from './steps/school-name';
import BranchesStep from './steps/branches';
import React from 'react';
import { onboardingFormSchema, OnboardingFormValues, StepKey } from '../types';
import { createTenant } from '../../server/action';
import { toast } from 'sonner';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useOrganizationList } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { CompletionScreen } from '../completion-screen';
import { SuccessScreen } from '../success-screen';
import SchoolWhatsappNumberStep from './steps/school-whatsapp-number';

interface StepConfig {
  title: string;
  component: React.ComponentType;
  validationFields: Array<keyof OnboardingFormValues>;
}

export const MultistepForm = () => {
  const methods = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      schoolName: '',
      schoolWhatsappNumber: '',
      branches: [{ name: '' }], // Start with one empty branch
    },
    reValidateMode: 'onSubmit',
  });

  const { handleSubmit, trigger } = methods;

  // Define the steps configuration
  const steps: Record<StepKey, StepConfig> = {
    'school-name': {
      title: 'School Information',
      component: SchoolNameStep,
      validationFields: ['schoolName'],
    },

    'school-whatsapp': {
      title: 'School Whatsapp Number',
      component: SchoolWhatsappNumberStep,
      validationFields: ['schoolWhatsappNumber'],
    },

    branches: {
      title: 'Branch Locations',
      component: BranchesStep,
      validationFields: ['branches'],
    },
  };

  // Define step order
  const stepOrder: StepKey[] = ['school-name', 'school-whatsapp', 'branches'];

  // Current step state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStepKey = stepOrder[currentStepIndex];
  const currentStep = steps[currentStepKey];
  const [isPending, setIsPending] = useState(false);
  useAuth();
  const { setActive } = useClerk();
  const { userMemberships } = useOrganizationList();
  const router = useRouter();

  // Completion flow state
  const [showCompletion, setShowCompletion] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [serverActionCompleted, setServerActionCompleted] = useState(false);
  const [animationsCompleted, setAnimationsCompleted] = useState(false);
  const [createdOrgIds, setCreatedOrgIds] = useState<string[]>([]);

  // Handle form submission
  const onSubmit: SubmitHandler<OnboardingFormValues> = async (data) => {
    setShowCompletion(true);
    setIsPending(true);
    setServerActionCompleted(false);
    setAnimationsCompleted(false);

    try {
      const response = await createTenant(data);
      if (response?.error) {
        setShowCompletion(false);
        toast.error(response.message);
      } else {
        if (response.organizationIds?.length) {
          setCreatedOrgIds(response.organizationIds);
        }
        setServerActionCompleted(true);
      }
    } catch (error) {
      console.error('Error creating tenant:', error);
      setShowCompletion(false);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  // Handle completion flow
  const handleCompletionComplete = () => {
    setAnimationsCompleted(true);
  };

  // Effect to handle transition to success screen when both conditions are met
  useEffect(() => {
    if (serverActionCompleted && animationsCompleted) {
      setShowCompletion(false);
      setShowSuccess(true);
    }
  }, [serverActionCompleted, animationsCompleted]);

  const handleRedirectToDashboard = async () => {
    // Get the first organization ID to set as active
    const targetOrgId = createdOrgIds[0] || userMemberships.data?.[0]?.organization?.id;

    if (targetOrgId) {
      console.log('Setting active organization:', targetOrgId);
      try {
        await setActive({ organization: targetOrgId });
        console.log('Successfully set active organization');
      } catch (error) {
        console.error('Failed to set active organization:', error);
      }
    }

    // Redirect to dashboard
    router.push('/dashboard');
  };

  // Handle next step
  const goToNextStep = async () => {
    // Validate only the fields for the current step
    const isStepValid = await trigger(
      currentStep.validationFields as Array<keyof OnboardingFormValues>
    );

    if (isStepValid) {
      if (currentStepIndex < stepOrder.length - 1) {
        // Move to next step
        setCurrentStepIndex(currentStepIndex + 1);
      } else {
        // Submit the form if on the last step
        handleSubmit(onSubmit)();
      }
    }
  };

  // Handle previous step
  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // Show completion screen
  if (showCompletion) {
    return <CompletionScreen onComplete={handleCompletionComplete} />;
  }

  // Show success screen
  if (showSuccess) {
    return <SuccessScreen onRedirect={handleRedirectToDashboard} />;
  }

  // Dynamically render the current step component
  const StepComponent = currentStep.component;

  return (
    <FormProvider {...methods}>
      <div className="w-full max-w-4xl mx-auto">
        {/* Progress indicator */}
        <div
          className="absolute top-0 left-0 bg-primary h-2 transition-all duration-300 ease-in-out"
          style={{ width: `${(currentStepIndex / stepOrder.length) * 100}%` }}
        />

        {/* Form content */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <StepComponent />

          {/* Navigation buttons */}
          <div className="flex justify-center gap-4 mt-20">
            {currentStepIndex > 0 && (
              <Button type="button" variant="outline" size="onboarding" onClick={goToPreviousStep}>
                Previous
              </Button>
            )}
            <Button
              type="button"
              variant="black"
              size="onboarding"
              onClick={goToNextStep}
              isLoading={isPending}
            >
              {currentStepIndex < stepOrder.length - 1 ? 'Next' : 'Submit'}
            </Button>
          </div>
        </form>
      </div>
    </FormProvider>
  );
};

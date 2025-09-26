'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useNextStep } from 'nextstepjs';
import { usePathname } from 'next/navigation';

export function OnboardingWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const { startNextStep, currentStep, setCurrentStep } = useNextStep();
  const currenPath = usePathname();

  const isOnboardingComplete = user?.publicMetadata?.isOnboardingComplete as boolean;

  useEffect(() => {
    if (!isLoaded || !user || currenPath === '/onboarding') return;

    // Start the onboarding tour for new users who haven't completed onboarding
    // Only start if no step is currently active
    if (!isOnboardingComplete && !currentStep) {
      startNextStep('onboardingTour');
    }
  }, [isLoaded, user, isOnboardingComplete, startNextStep, currentStep, currenPath]);

  useEffect(() => {
    if (currenPath === '/vehicles' && currentStep === 2) {
      setCurrentStep(3);
    }
    if (currenPath === '/vehicles/add' && currentStep === 3) {
      setCurrentStep(4);
    }
    if (currenPath === '/vehicles' && currentStep === 4) {
      setCurrentStep(5);
    }
  }, [isLoaded, user, currentStep, currenPath, setCurrentStep]);

  return <>{children}</>;
}

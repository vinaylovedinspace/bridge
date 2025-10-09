'use client';

import { useClerk } from '@clerk/nextjs';
import { NextStep } from 'nextstepjs';

import { tourSteps } from '@/lib/tour-steps';
import { markOnboardingComplete } from '@/server/actions/user';

export function TourWrapper({ children }: { children: React.ReactNode }) {
  const { session } = useClerk();

  const handleComplete = async () => {
    await markOnboardingComplete();
    await session?.reload();
  };

  const handleSkip = async () => {
    await markOnboardingComplete();
    await session?.reload();
  };

  return (
    <NextStep steps={tourSteps} onComplete={handleComplete} onSkip={handleSkip}>
      {children}
    </NextStep>
  );
}

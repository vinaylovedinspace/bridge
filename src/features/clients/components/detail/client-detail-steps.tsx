'use client';

import { BranchConfig } from '@/server/action/branch';
import { Client } from '@/server/db/client';
import { ClientDetailStepKey } from './progress-bar';
import { PersonalInfoStep } from './steps/personal-info';
import { LicenseStep } from './steps/license-step';
import { PlansStep } from './steps/plans-step';

type ClientDetailStepsProps = {
  currentStep: ClientDetailStepKey;
  client: NonNullable<Client>;
  branchConfig: BranchConfig;
};

export const ClientDetailSteps = ({ currentStep, client }: ClientDetailStepsProps) => {
  const stepComponents = {
    personal: <PersonalInfoStep />,
    license: <LicenseStep />,
    plans: <PlansStep client={client} />,
  };

  return stepComponents[currentStep];
};

'use client';

import { RTOService } from '../../server/db';
import { RTOServiceStepKey } from './progress-bar';
import { PaymentContainer } from './steps/payment';
import { PersonalInfoStep } from './steps/personal-info';
import { LicenseStep } from './steps/service';

type RTOServiceFormStepsProps = {
  currentStep: RTOServiceStepKey;
  rtoService?: RTOService;
};

export const RTOServiceFormSteps = ({ currentStep, rtoService }: RTOServiceFormStepsProps) => {
  const stepComponents = {
    personal: <PersonalInfoStep />,
    license: <LicenseStep />,
    payment: <PaymentContainer existingPayment={rtoService?.payment} />,
  };

  return stepComponents[currentStep] ?? null;
};

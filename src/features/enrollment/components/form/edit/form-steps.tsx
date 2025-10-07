'use client';

import { ServiceTypeStep } from '@/features/enrollment/components/form/steps/service-type';
import { PersonalInfoStep } from '@/features/enrollment/components/form/steps/personal-info';
import { LicenseStep } from '@/features/enrollment/components/form/steps/license';
import { PlanStep } from '@/features/enrollment/components/form/steps/plan';
import { AdmissionFormStepKey } from '../../progress-bar/progress-bar';
import { PaymentContainerWithEnrollment } from './payment-container';
import { Enrollment } from '@/server/db/plan';

type EditFormStepsProps = {
  currentStep: AdmissionFormStepKey;
  enrollment: NonNullable<Enrollment>;
};

export const EditFormSteps = ({ currentStep, enrollment }: EditFormStepsProps) => {
  const stepComponents = {
    service: <ServiceTypeStep disabled={true} />,
    personal: <PersonalInfoStep />,
    license: <LicenseStep isEditMode={true} />,
    plan: <PlanStep currentClientId={enrollment.clientId} />,
    payment: <PaymentContainerWithEnrollment enrollment={enrollment} />,
  };

  return stepComponents[currentStep];
};

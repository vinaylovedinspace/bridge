'use client';

import { ServiceTypeStep } from '@/features/enrollment/components/form/steps/service-type';
import { PersonalInfoStep } from '@/features/enrollment/components/form/steps/personal-info';
import { LicenseStep } from '@/features/enrollment/components/form/steps/license';
import { PlanStep } from '@/features/enrollment/components/form/steps/plan';
import { BranchConfig } from '@/server/db/branch';
import { AdmissionFormStepKey } from '../../progress-bar/progress-bar';
import { PaymentContainer } from './payment-container';
import { Enrollment } from '@/server/db/plan';

type EditFormStepsProps = {
  currentStep: AdmissionFormStepKey;
  enrollment: NonNullable<Enrollment>;
  branchConfig: BranchConfig;
};

export const EditFormSteps = ({ currentStep, enrollment, branchConfig }: EditFormStepsProps) => {
  const stepComponents = {
    service: <ServiceTypeStep disabled={true} />,
    personal: <PersonalInfoStep />,
    license: (
      <LicenseStep isEditMode={true} branchServiceCharge={branchConfig.licenseServiceCharge ?? 0} />
    ),
    plan: <PlanStep branchConfig={branchConfig} currentClientId={enrollment.id} />,
    payment: <PaymentContainer payment={enrollment.payment} />,
  };

  return stepComponents[currentStep];
};

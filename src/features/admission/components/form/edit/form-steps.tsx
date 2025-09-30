'use client';

import { ServiceTypeStep } from '@/features/admission/components/form/steps/service-type';
import { PersonalInfoStep } from '@/features/admission/components/form/steps/personal-info';
import { LicenseStep } from '@/features/admission/components/form/steps/license';
import { PlanStep } from '@/features/admission/components/form/steps/plan';
import { ClientDetail } from '@/server/db/client';
import { BranchConfig } from '@/server/db/branch';
import { AdmissionFormStepKey } from '../../progress-bar/progress-bar';
import { PaymentContainer } from './payment-container';

type EditFormStepsProps = {
  currentStep: AdmissionFormStepKey;
  client: NonNullable<ClientDetail>;
  branchConfig: BranchConfig;
};

export const EditFormSteps = ({ currentStep, client, branchConfig }: EditFormStepsProps) => {
  const stepComponents = {
    service: <ServiceTypeStep disabled={true} />,
    personal: <PersonalInfoStep />,
    license: (
      <LicenseStep isEditMode={true} branchServiceCharge={branchConfig.licenseServiceCharge ?? 0} />
    ),
    plan: <PlanStep branchConfig={branchConfig} currentClientId={client.id} />,
    payment: <PaymentContainer payment={client.plan[0].payment} />,
  };

  return stepComponents[currentStep];
};

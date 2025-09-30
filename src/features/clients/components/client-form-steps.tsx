'use client';

import { ServiceTypeStep } from '@/features/admission/components/form/steps/service-type';
import { PersonalInfoStep } from '@/features/admission/components/form/steps/personal-info';
import { LicenseStep } from '@/features/admission/components/form/steps/license';
import { PlanStep } from '@/features/admission/components/form/steps/plan';
import { ClientPaymentContainer } from './client-payment-container';
import { ClientDetail } from '@/server/db/client';
import { BranchConfig } from '@/server/db/branch';

type StepKey = 'service' | 'personal' | 'license' | 'plan' | 'payment';

type ClientFormStepsProps = {
  currentStep: StepKey;
  client: NonNullable<ClientDetail>;
  branchConfig: BranchConfig;
};

export const ClientFormSteps = ({ currentStep, client, branchConfig }: ClientFormStepsProps) => {
  const payment = client.plan?.[0]?.payment;

  const stepComponents = {
    service: <ServiceTypeStep disabled={true} />,
    personal: <PersonalInfoStep />,
    license: (
      <LicenseStep isEditMode={true} branchServiceCharge={branchConfig.licenseServiceCharge ?? 0} />
    ),
    plan: <PlanStep branchConfig={branchConfig} currentClientId={client.id} />,
    payment: <ClientPaymentContainer existingPayment={payment || null} />,
  };

  return stepComponents[currentStep];
};

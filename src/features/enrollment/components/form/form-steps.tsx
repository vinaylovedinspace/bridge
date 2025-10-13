'use client';

import { ServiceTypeStep } from '@/features/enrollment/components/form/steps/service-type';
import { PersonalInfoStep } from '@/features/enrollment/components/form/steps/personal-info';
import { LicenseStep } from '@/features/enrollment/components/form/steps/license';
import { PlanStep } from '@/features/enrollment/components/form/steps/plan';

import { Enrollment } from '@/server/db/plan';
import { AdmissionFormStepKey } from '../../types';
import { PaymentContainer, PaymentContainerWithEnrollment } from './steps/payment';

type EnrollmentFormStepsProps = {
  currentStep: AdmissionFormStepKey;
  enrollment?: Enrollment;
};

export const EnrollmentFormSteps = ({ currentStep, enrollment }: EnrollmentFormStepsProps) => {
  const stepComponents = {
    service: <ServiceTypeStep disabled={enrollment?.serviceType !== undefined} />,
    personal: <PersonalInfoStep />,
    license: <LicenseStep />,
    plan: <PlanStep />,
    payment: enrollment?.payment ? (
      <PaymentContainerWithEnrollment payment={enrollment.payment} />
    ) : (
      <PaymentContainer />
    ),
  };

  return stepComponents[currentStep];
};

'use client';

import { TypographyH1, TypographyH2 } from '@/components/ui/typography';
import { Controller, useFormContext } from 'react-hook-form';
import MultiStepFormInput from '../form-input';
import { OnboardingFormValues } from '../../types';
import SchoolNameStep from './school-name';

export const SchoolWhatsappNumberStep = () => {
  const {
    control,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>();

  return (
    <div className="flex flex-col items-center h-full gap-20 pt-[20vh]">
      <div className="flex-1 flex flex-col justify-center items-center gap-10">
        <TypographyH1 className="text-center">What&apos;s your whatsapp number?</TypographyH1>
        <TypographyH2 className="text-center font-normal">
          This number will be used to send whatsapp messages to the clients
        </TypographyH2>

        <div className="w-2/3 mt-10">
          <Controller
            name="schoolWhatsappNumber"
            control={control}
            render={({ field }) => (
              <MultiStepFormInput
                placeholder="Enter your school whatsapp number"
                error={errors.schoolWhatsappNumber?.message as string}
                {...field}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default SchoolWhatsappNumberStep;

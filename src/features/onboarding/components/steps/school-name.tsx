'use client';

import { TypographyH1, TypographyH2 } from '@/components/ui/typography';
import { Controller, useFormContext } from 'react-hook-form';
import MultiStepFormInput from '../form-input';
import { OnboardingFormValues } from '../types';

export const SchoolNameStep = () => {
  const {
    control,
    formState: { errors },
  } = useFormContext<OnboardingFormValues>();

  return (
    <div className="flex flex-col items-center h-full gap-20 pt-[20vh]">
      <div className="flex-1 flex flex-col justify-center items-center gap-10">
        <TypographyH1 className="text-center">What&apos;s your school name?</TypographyH1>
        <TypographyH2 className="text-center font-normal">
          This will be displayed to your students
        </TypographyH2>

        <div className="w-2/3 mt-10">
          <Controller
            name="schoolName"
            control={control}
            render={({ field }) => (
              <MultiStepFormInput
                placeholder="Enter your school name"
                error={errors.schoolName?.message as string}
                {...field}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default SchoolNameStep;

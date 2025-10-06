'use client';

import { Button } from '@/components/ui/button';
import { TypographyH1, TypographyMuted } from '@/components/ui/typography';
import { PlusCircle } from 'lucide-react';
import { Controller, useFormContext } from 'react-hook-form';
import MultiStepFormInput from '../form-input';
import { BranchField, OnboardingFormValues } from '../../types';

export const BranchesStep = () => {
  const {
    control,
    setValue,
    formState: { errors },
    watch,
  } = useFormContext<OnboardingFormValues>();

  const branches = watch('branches');

  // Convert branches array to BranchField array for UI rendering
  const fields: BranchField[] = branches.map((branch, index) => ({
    id: index,
    name: branch.name,
  }));

  // Handle adding a new branch
  const append = () => {
    const newBranches = [...branches, { name: '' }];
    setValue('branches', newBranches);
  };

  // Handle removing a branch
  const remove = (index: number) => {
    const newBranches = [...branches];
    newBranches.splice(index, 1);
    setValue('branches', newBranches);
  };

  return (
    <div className="flex flex-col items-center h-full gap-20 pt-[20vh]">
      <div className="flex-1 flex flex-col justify-center items-center gap-10">
        <TypographyH1 className="text-center">How many branches do you have?</TypographyH1>
        <TypographyMuted className="text-2xl text-center max-w-[36rem]">
          This will help you manage data (clients, payments, and staff) separately for each branch
        </TypographyMuted>

        <div className="flex flex-col gap-6 w-2/3 mt-10">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2 relative">
              <Controller
                name={`branches.${index}.name`}
                control={control}
                render={({ field }) => (
                  <MultiStepFormInput
                    placeholder={`Enter ${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} branch name`}
                    error={errors.branches?.[index]?.name?.message as string}
                    {...field}
                  />
                )}
              />
              {index > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="text-red-500 absolute right-0"
                >
                  ✕
                </Button>
              )}
            </div>
          ))}

          {/* Show general error message if there's a branches array-level error */}
          {errors.branches?.message && (
            <div className="text-red-500 text-sm mt-1">{errors.branches.message}</div>
          )}
        </div>

        <Button type="button" variant="text" onClick={append}>
          <PlusCircle className="size-6 mr-2" /> Add branch
        </Button>
      </div>
    </div>
  );
};

export default BranchesStep;

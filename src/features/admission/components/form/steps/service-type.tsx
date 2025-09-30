'use client';

import { useFormContext } from 'react-hook-form';
import { AdmissionFormValues } from '@/features/admission/types';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TypographyH3, TypographyH4, TypographySmall } from '@/components/ui/typography';
import { GraduationCap, Car } from 'lucide-react';

type ServiceTypeStepProps = {
  disabled?: boolean;
};

const serviceTypeOptions = [
  {
    value: 'FULL_SERVICE' as const,
    label: 'Full Service Package',
    description: 'We handle your license applications + professional driving training',
    icon: GraduationCap,
  },
  {
    value: 'DRIVING_ONLY' as const,
    label: 'Driving Training Only',
    description: 'Professional driving lessons - we collect license info for our records',
    icon: Car,
  },
];

export const ServiceTypeStep = ({ disabled = false }: ServiceTypeStepProps) => {
  const { control } = useFormContext<AdmissionFormValues>();

  return (
    <div className="space-y-10 flex flex-col justify-center items-center pt-10">
      <TypographyH4>{disabled ? 'Selected Service Type' : 'Choose Your Service Type'}</TypographyH4>

      <FormField
        control={control}
        name="personalInfo.serviceType"
        render={({ field }) => (
          <FormItem className="space-y-6">
            <FormControl>
              <RadioGroup
                onValueChange={disabled ? undefined : field.onChange}
                value={field.value}
                className="flex justify-center items-center gap-10"
                disabled={disabled}
              >
                {serviceTypeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = field.value === option.value;

                  return (
                    <FormItem key={option.value} className="max-w-md">
                      <FormLabel
                        className={disabled ? 'cursor-default h-full' : 'cursor-pointer h-full'}
                      >
                        <div
                          className={`border rounded-lg p-6 transition-all h-full flex flex-col ${
                            isSelected
                              ? `border-primary bg-primary/5 shadow-md ${disabled ? 'opacity-60' : ''}`
                              : `border-gray-200 ${disabled ? 'opacity-40' : 'hover:border-gray-300 hover:shadow-md'}`
                          }`}
                        >
                          <div className="flex items-start space-x-4">
                            <FormControl>
                              <RadioGroupItem
                                value={option.value}
                                className="sr-only"
                                disabled={disabled}
                              />
                            </FormControl>

                            <div className="flex items-center space-x-4">
                              <div
                                className={`w-12 h-12 px-3 py-3 rounded-full flex items-center justify-center ${
                                  isSelected ? 'bg-primary/20' : 'bg-gray-100'
                                }`}
                              >
                                <Icon
                                  className={`w-6 h-6 ${
                                    isSelected ? 'text-primary' : 'text-gray-600'
                                  }`}
                                />
                              </div>
                              <div className="space-y-1">
                                <TypographyH3 className="font-semibold text-lg">
                                  {option.label}
                                </TypographyH3>
                                <TypographySmall className="text-sm text-gray-600">
                                  {option.description}
                                </TypographySmall>
                              </div>
                            </div>
                          </div>
                        </div>
                      </FormLabel>
                    </FormItem>
                  );
                })}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default ServiceTypeStep;

'use client';

import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { TypographyH5 } from '@/components/ui/typography';
import { Combobox } from '@/components/ui/combobox';
import { RTOServiceFormValues, RTO_SERVICE_TYPE_LABELS } from '@/features/rto-services/types';

export const LicenseStep = () => {
  const { control } = useFormContext<RTOServiceFormValues>();

  const serviceTypeOptions = Object.entries(RTO_SERVICE_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-12">
        <TypographyH5 className="col-span-3 ">Service Type</TypographyH5>
        <div className="col-span-3">
          <FormField
            control={control}
            name="service.type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Type</FormLabel>
                <FormControl>
                  <Combobox
                    options={serviceTypeOptions}
                    value={field.value}
                    onValueChange={(value) => value && field.onChange(value)}
                    placeholder="Select service type"
                    searchPlaceholder="Search service types..."
                    emptyText="No service type found."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-12">
        <TypographyH5 className="col-span-3">Licence Details</TypographyH5>
        <div className="grid grid-cols-3 col-span-9 gap-6">
          <FormField
            control={control}
            name="service.license.licenseNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Licence Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Licence number"
                    value={field.value || ''}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="service.license.issueDate"
            render={() => (
              <FormItem>
                <FormLabel>Issue Date</FormLabel>
                <FormControl>
                  <DatePicker
                    name="service.license.issueDate"
                    control={control}
                    placeholderText="Select issue date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="service.license.expiryDate"
            render={() => (
              <FormItem>
                <FormLabel>Expiry Date</FormLabel>
                <FormControl>
                  <DatePicker
                    name="service.license.expiryDate"
                    control={control}
                    placeholderText="Select expiry date"
                    minDate={new Date('1900-01-01')}
                    maxDate={new Date(2100, 0, 1)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
};

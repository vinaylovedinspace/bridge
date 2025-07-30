'use client';

import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { TypographyH5 } from '@/components/ui/typography';
import { AdmissionFormValues } from '@/features/admission/types';
import { MultiSelect } from '@/components/ui/multi-select';

export const LicenseStep = () => {
  const { control } = useFormContext<AdmissionFormValues>();

  // Create options array for MultiSelect - showing only the 3 most common license types
  const licenseClassOptions = [
    {
      label: 'LMV (Light Motor Vehicle)',
      value: 'LMV',
    },
    {
      label: 'MCWG (Motorcycle with Gear)',
      value: 'MCWG',
    },
    {
      label: 'MCWOG (Motorcycle without Gear)',
      value: 'MCWOG',
    },
  ];

  return (
    <div className="space-y-10">
      {/* License Classes */}
      <div className="grid grid-cols-12">
        <TypographyH5 className="col-span-3">License Classes</TypographyH5>
        <div className="col-span-3">
          <FormField
            control={control}
            name="learningLicense.class"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Applying for</FormLabel>
                <MultiSelect
                  options={licenseClassOptions}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  placeholder="Select license classes"
                  maxCount={5}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Learning License Section */}
      <div className="grid grid-cols-12">
        <TypographyH5 className="col-span-3">Learning License</TypographyH5>
        <div className="grid grid-cols-3 col-span-9 gap-6">
          <FormField
            control={control}
            name="learningLicense.licenseNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>License Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="License number"
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
            name="learningLicense.applicationNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Application Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Application number"
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
            name="learningLicense.testConductedOn"
            render={() => (
              <FormItem>
                <FormLabel>Test Date</FormLabel>
                <FormControl>
                  <DatePicker
                    name="learningLicense.testConductedOn"
                    control={control}
                    placeholderText="Select test date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="learningLicense.issueDate"
            render={() => (
              <FormItem>
                <FormLabel>Issue Date</FormLabel>
                <FormControl>
                  <DatePicker
                    name="learningLicense.issueDate"
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
            name="learningLicense.expiryDate"
            render={() => (
              <FormItem>
                <FormLabel>Expiry Date</FormLabel>
                <FormControl>
                  <DatePicker
                    name="learningLicense.expiryDate"
                    control={control}
                    placeholderText="Select expiry date"
                    minDate={new Date('1900-01-01')}
                    maxDate={new Date(2100, 0, 1)} // Allow future dates for expiry
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Driving License Section */}
      <div className="grid grid-cols-12">
        <TypographyH5 className="col-span-3">Driving License</TypographyH5>
        <div className="grid grid-cols-3 col-span-9 gap-6">
          <FormField
            control={control}
            name="drivingLicense.licenseNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>License Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="License number"
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
            name="drivingLicense.applicationNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Application Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Application number"
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
            name="drivingLicense.appointmentDate"
            render={() => (
              <FormItem>
                <FormLabel>Appointment Date</FormLabel>
                <FormControl>
                  <DatePicker
                    name="drivingLicense.appointmentDate"
                    control={control}
                    placeholderText="Select appointment date"
                    maxDate={new Date(2100, 0, 1)} // Allow future dates for appointments
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="drivingLicense.issueDate"
            render={() => (
              <FormItem>
                <FormLabel>Issue Date</FormLabel>
                <FormControl>
                  <DatePicker
                    name="drivingLicense.issueDate"
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
            name="drivingLicense.expiryDate"
            render={() => (
              <FormItem>
                <FormLabel>Expiry Date</FormLabel>
                <FormControl>
                  <DatePicker
                    name="drivingLicense.expiryDate"
                    control={control}
                    placeholderText="Select expiry date"
                    minDate={new Date('1900-01-01')}
                    maxDate={new Date(2100, 0, 1)} // Allow future dates for expiry
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="drivingLicense.testConductedBy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Test Conducted By</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Test conducted by"
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
            name="drivingLicense.imv"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IMV</FormLabel>
                <FormControl>
                  <Input placeholder="IMV" value={field.value || ''} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="drivingLicense.rto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RTO</FormLabel>
                <FormControl>
                  <Input placeholder="RTO" value={field.value || ''} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="drivingLicense.department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Department"
                    value={field.value || ''}
                    onChange={field.onChange}
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

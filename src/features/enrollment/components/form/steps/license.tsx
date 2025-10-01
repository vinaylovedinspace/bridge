'use client';

import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { TypographyH5 } from '@/components/ui/typography';
import { AdmissionFormValues } from '@/features/enrollment/types';
import { MultiSelect } from '@/components/ui/multi-select';
import { calculateLicenseFees } from '@/lib/constants/rto-fees';
import { LICENSE_CLASS_OPTIONS } from '@/lib/constants/license-classes';

type LicenseStepProps = {
  branchServiceCharge?: number;
  isEditMode?: boolean;
};

export const LicenseStep = ({ branchServiceCharge = 0, isEditMode = false }: LicenseStepProps) => {
  const { control, watch } = useFormContext<AdmissionFormValues>();

  // Watch service type to conditionally show/hide fields
  const serviceType = watch('serviceType');

  // Watch selected license classes and existing license info for fee calculation
  const selectedLicenseClasses = watch('learningLicense.class') || [];
  const existingLearningLicenseNumber = watch('learningLicense.licenseNumber') || '';

  // Check if student already has a learners license
  const hasExistingLearners = existingLearningLicenseNumber.trim().length > 0;

  // In edit mode, don't apply the existing learners discount since it was already applied during creation
  const shouldApplyExistingLearnersDiscount = hasExistingLearners && !isEditMode;

  // Calculate fees based on scenario
  const feeCalculation = calculateLicenseFees(
    selectedLicenseClasses,
    shouldApplyExistingLearnersDiscount,
    branchServiceCharge
  );

  return (
    <div className="space-y-10">
      {/* License Classes - Always show, but change behavior based on service type */}
      <div className="grid grid-cols-12">
        <TypographyH5 className="col-span-3">License Classes</TypographyH5>
        <div className="col-span-4">
          <FormField
            control={control}
            name="learningLicense.class"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>
                  {serviceType === 'DRIVING_ONLY' ? 'License Class' : 'Applying for'}
                </FormLabel>
                <MultiSelect
                  options={LICENSE_CLASS_OPTIONS}
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
        <div className="col-span-5 h-full">
          {selectedLicenseClasses.length > 0 && serviceType !== 'DRIVING_ONLY' && (
            <div className="text-right h-full flex flex-col justify-end">
              <div className="text-sm text-gray-600">
                Estimated License Fees:{' '}
                <span className="text-lg font-semibold text-blue-700">₹{feeCalculation.total}</span>
              </div>

              <div className="text-xs text-gray-500">
                Govt: ₹{feeCalculation.governmentFees} + Service: ₹{branchServiceCharge}
              </div>
            </div>
          )}
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

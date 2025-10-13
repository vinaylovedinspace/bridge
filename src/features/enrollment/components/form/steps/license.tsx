'use client';

import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { TypographyH5, TypographyMuted } from '@/components/ui/typography';
import { AdmissionFormValues } from '@/features/enrollment/types';
import { MultiSelect } from '@/components/ui/multi-select';
import { calculateLicenseFees } from '@/lib/constants/rto-fees';
import { LICENSE_CLASS_OPTIONS, LicenseClass } from '@/lib/constants/license-classes';
import { branchServiceChargeAtom } from '@/lib/atoms/branch-config';
import { useAtomValue } from 'jotai';
import { Checkbox } from '@/components/ui/checkbox';
import { useMemo, useEffect } from 'react';

export const LicenseStep = () => {
  const branchServiceCharge = useAtomValue(branchServiceChargeAtom);
  const { control, watch, getValues, setValue } = useFormContext<AdmissionFormValues>();

  // Watch service type to conditionally show/hide fields
  const serviceType = watch('serviceType');

  // Watch selected license classes and checkbox for fee calculation
  const _selectedLicenseClasses = watch('learningLicense.class');

  const selectedLicenseClasses = useMemo(
    () => _selectedLicenseClasses ?? [],
    [_selectedLicenseClasses]
  );

  const excludeLearningLicenseFee = watch('learningLicense.excludeLearningLicenseFee') ?? false;

  // Calculate fees breakdown for display (only if not excluded)
  const feeCalculation = useMemo(() => {
    return calculateLicenseFees({
      licenseClasses: selectedLicenseClasses,
      excludeLearningLicenseFee,
      serviceCharge: branchServiceCharge,
    });
  }, [branchServiceCharge, excludeLearningLicenseFee, selectedLicenseClasses]);

  // Update form value when fees change
  useEffect(() => {
    setValue('payment.licenseServiceFee', feeCalculation.total);
  }, [feeCalculation.total, setValue]);

  return (
    <div className="space-y-10">
      {/* License Classes - Always show, but change behavior based on service type */}
      <div className="grid grid-cols-12">
        <TypographyH5 className="col-span-3">Licence Classes</TypographyH5>
        <div className="col-span-4">
          <FormField
            control={control}
            name="learningLicense.class"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>
                  {serviceType === 'DRIVING_ONLY' ? 'Licence Class' : 'Applying for'}
                </FormLabel>
                <MultiSelect
                  options={LICENSE_CLASS_OPTIONS}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setValue('drivingLicense.class', value as LicenseClass[]);
                  }}
                  defaultValue={field.value}
                  placeholder="Select licence classes"
                  maxCount={5}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {serviceType == 'FULL_SERVICE' && (
            <FormField
              control={control}
              name="learningLicense.excludeLearningLicenseFee"
              render={({ field }) => (
                <FormItem className="flex space-y-0 pt-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={getValues('payment.paymentStatus') === 'FULLY_PAID'}
                    />
                  </FormControl>
                  <TypographyMuted className="text-xs">
                    Student already has Learning Licence (exclude LL fees)
                  </TypographyMuted>
                </FormItem>
              )}
            />
          )}
        </div>
        <div className="col-span-5 h-full">
          {selectedLicenseClasses.length > 0 && serviceType !== 'DRIVING_ONLY' && (
            <div className="text-right h-full flex flex-col justify-end">
              <div className="text-sm text-gray-600">
                Estimated Licence Fees:{' '}
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
        <TypographyH5 className="col-span-3">Learning Licence</TypographyH5>
        <div className="grid grid-cols-3 col-span-9 gap-6">
          <FormField
            control={control}
            name="learningLicense.licenseNumber"
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
        <TypographyH5 className="col-span-3">Driving Licence</TypographyH5>
        <div className="grid grid-cols-3 col-span-9 gap-6">
          <FormField
            control={control}
            name="drivingLicense.licenseNumber"
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

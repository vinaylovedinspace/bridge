'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { RTOServiceFormData } from '@/features/rto-services/schemas/rto-services';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StateSelect } from '@/components/ui/state-select';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { TypographyH5, TypographyP } from '@/components/ui/typography';
import { useEffect } from 'react';

export const PersonalInfoStep = () => {
  const methods = useFormContext<RTOServiceFormData>();
  const { control, setValue, clearErrors } = methods;

  // Watch for changes in the checkbox and address fields
  const isSameAddress = useWatch({
    control,
    name: 'clientInfo.isCurrentAddressSameAsPermanentAddress',
  });

  const currentAddressLine1 = useWatch({
    control,
    name: 'clientInfo.addressLine1',
  });

  const currentAddressLine2 = useWatch({
    control,
    name: 'clientInfo.addressLine2',
  });

  const currentAddressLine3 = useWatch({
    control,
    name: 'clientInfo.addressLine3',
  });

  const currentCity = useWatch({
    control,
    name: 'clientInfo.city',
  });

  const currentState = useWatch({
    control,
    name: 'clientInfo.state',
  });

  const currentPincode = useWatch({
    control,
    name: 'clientInfo.pincode',
  });

  // Auto-fill permanent address when checkbox is checked
  useEffect(() => {
    if (isSameAddress) {
      setValue('clientInfo.permanentAddressLine1', currentAddressLine1 || '');
      setValue('clientInfo.permanentAddressLine2', currentAddressLine2 || '');
      setValue('clientInfo.permanentAddressLine3', currentAddressLine3 || '');
      setValue('clientInfo.permanentCity', currentCity || '');
      setValue('clientInfo.permanentState', currentState || '');
      setValue('clientInfo.permanentPincode', currentPincode || '');

      // Clear any validation errors for permanent address fields
      clearErrors('clientInfo.permanentAddressLine1');
      clearErrors('clientInfo.permanentAddressLine2');
      clearErrors('clientInfo.permanentAddressLine3');
      clearErrors('clientInfo.permanentCity');
      clearErrors('clientInfo.permanentState');
      clearErrors('clientInfo.permanentPincode');
    }
  }, [
    isSameAddress,
    currentAddressLine1,
    currentAddressLine2,
    currentAddressLine3,
    currentCity,
    currentState,
    currentPincode,
    setValue,
    clearErrors,
  ]);

  return (
    <div className="space-y-10">
      {/* Basic Information */}
      <div className="grid grid-cols-12">
        <TypographyH5 className="col-span-3">Personal Details</TypographyH5>

        <div className="grid grid-cols-3 col-span-9 gap-6 items-end">
          <FormField
            control={control}
            name="clientInfo.aadhaarNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Aadhaar Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="123456789012"
                    value={field.value || ''}
                    onChange={field.onChange}
                    maxLength={12}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="clientInfo.firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>First Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter first name"
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
            name="clientInfo.middleName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Middle Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter middle name"
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
            name="clientInfo.lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Last Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter last name"
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
            name="clientInfo.fatherName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Father&apos;s Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter father's name"
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
            name="clientInfo.birthDate"
            render={() => (
              <FormItem>
                <FormLabel required>Date of Birth</FormLabel>
                <FormControl>
                  <DatePicker
                    name="clientInfo.birthDate"
                    control={control}
                    placeholderText="Select date of birth"
                    maxDate={new Date()}
                    minDate={new Date('1900-01-01')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="clientInfo.gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Gender</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="clientInfo.bloodGroup"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Blood Group</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Contact Details */}
      <div className="grid grid-cols-12">
        <TypographyH5 className="col-span-3">Contact Details</TypographyH5>

        <div className="grid grid-cols-3 col-span-9 gap-6 items-end">
          <FormField
            control={control}
            name="clientInfo.phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Phone Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="10-digit mobile number"
                    value={field.value || ''}
                    onChange={field.onChange}
                    maxLength={10}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="clientInfo.email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="email@example.com"
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
            name="clientInfo.emergencyContactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Emergency Contact Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Emergency contact person name"
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
            name="clientInfo.emergencyContact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Emergency Contact Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Emergency contact phone number"
                    value={field.value || ''}
                    onChange={field.onChange}
                    maxLength={10}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="clientInfo.passportNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Passport Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="For international permits"
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

      {/* Address */}
      <div className="grid grid-cols-12">
        <TypographyH5 className="col-span-3">Address</TypographyH5>

        <div className="grid grid-cols-3 col-span-9 gap-6 items-end">
          <FormField
            control={control}
            name="clientInfo.addressLine1"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>House/Door/Flat No</FormLabel>
                <FormControl>
                  <Input
                    placeholder="House/Door/Flat No"
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
            name="clientInfo.addressLine2"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Street/Locality/Police Station</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Street/Locality/Police Station"
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
            name="clientInfo.addressLine3"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location/Landmark</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Location/Landmark"
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
            name="clientInfo.city"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>City</FormLabel>
                <FormControl>
                  <Input placeholder="City" value={field.value || ''} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="clientInfo.state"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>State</FormLabel>
                <FormControl>
                  <StateSelect
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    placeholder="Select state"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="clientInfo.pincode"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Pincode</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Pincode"
                    value={field.value || ''}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <TypographyP className="col-span-3">Permanent Address</TypographyP>

          <FormField
            control={control}
            name="clientInfo.isCurrentAddressSameAsPermanentAddress"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 col-span-3">
                <FormControl>
                  <Checkbox checked={field.value === true} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Same as current Address</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {!isSameAddress && (
            <>
              <FormField
                control={control}
                name="clientInfo.permanentAddressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>House/Door/Flat No</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="House/Door/Flat No"
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
                name="clientInfo.permanentAddressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Street/Locality/Police Station</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Street/Locality/Police Station"
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
                name="clientInfo.permanentAddressLine3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location/Landmark</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Location/Landmark"
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
                name="clientInfo.permanentCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>City</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="City"
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
                name="clientInfo.permanentState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>State</FormLabel>
                    <FormControl>
                      <StateSelect
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        placeholder="Select state"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="clientInfo.permanentPincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Pincode</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Pincode"
                        value={field.value || ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

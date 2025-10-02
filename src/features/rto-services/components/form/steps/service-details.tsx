'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { useEffect } from 'react';
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
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { TypographyH5, TypographyP } from '@/components/ui/typography';
import { RTO_SERVICE_TYPE_LABELS } from '@/features/rto-services/types';
import { calculateRTOServiceFees } from '@/lib/constants/rto-fees';
import { RTOOfficeSelect } from '@/components/ui/rto-office-select';

export const ServiceDetailsStep = () => {
  const methods = useFormContext<RTOServiceFormData>();
  const { control, setValue } = methods;

  // Watch for changes in service type and priority for fee calculation
  const watchedServiceType = useWatch({ control, name: 'serviceType' });
  const watchedPriority = useWatch({ control, name: 'priority' });
  const watchedGovernmentFees = useWatch({ control, name: 'governmentFees' });
  const watchedServiceCharge = useWatch({ control, name: 'serviceCharge' });
  const watchedUrgentFees = useWatch({ control, name: 'urgentFees' });

  // Watch user's pincode for RTO suggestion
  const userPincode = useWatch({ control, name: 'clientInfo.pincode' });

  // Auto-populate fees when service type or priority changes
  useEffect(() => {
    if (watchedServiceType) {
      const fees = calculateRTOServiceFees(
        watchedServiceType as Parameters<typeof calculateRTOServiceFees>[0],
        watchedPriority as Parameters<typeof calculateRTOServiceFees>[1]
      );
      setValue('governmentFees', fees.governmentFees);
      setValue('serviceCharge', fees.serviceCharge);
      setValue('urgentFees', fees.urgentFees);
      setValue('totalAmount', fees.totalAmount);
    }
  }, [watchedServiceType, watchedPriority, setValue]);

  // Auto-calculate total when individual fees change
  useEffect(() => {
    const total =
      (watchedGovernmentFees || 0) + (watchedServiceCharge || 0) + (watchedUrgentFees || 0);
    setValue('totalAmount', total);
  }, [watchedGovernmentFees, watchedServiceCharge, watchedUrgentFees, setValue]);

  return (
    <div className="space-y-10">
      {/* Service Type Selection */}
      <div className="grid grid-cols-12">
        <TypographyH5 className="col-span-3">Service Information</TypographyH5>

        <div className="grid grid-cols-3 col-span-9 gap-6 items-end w-full">
          <FormField
            control={control}
            name="serviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Service Type</FormLabel>
                <FormControl>
                  <Combobox
                    options={Object.entries(RTO_SERVICE_TYPE_LABELS).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select service type"
                    searchPlaceholder="Search service types..."
                    emptyText="No service type found."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="TATKAL">Tatkal</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="rtoOffice"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>RTO Office</FormLabel>
                <FormControl>
                  <RTOOfficeSelect
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    placeholder="Select RTO office"
                    userPincode={userPincode}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="existingLicenseNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Licence Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter licence number"
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

      {/* Fee Calculation */}
      <div className="grid grid-cols-12">
        <div className="col-span-3 flex items-center gap-2">
          <TypographyH5>Fee Calculation</TypographyH5>
          <Badge variant="outline" className="text-xs">
            Auto-calculated
          </Badge>
        </div>

        <div className="grid grid-cols-4 col-span-9 gap-4 items-end">
          <FormField
            control={control}
            name="governmentFees"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Government Fees</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="serviceCharge"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Service Charge</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="urgentFees"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Urgent Fees</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="totalAmount"
            render={({ field }) => (
              <FormItem className="">
                <FormLabel>Total Amount</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="text-lg font-semibold bg-muted"
                      readOnly
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Additional Information */}
      <div className="grid grid-cols-12">
        <TypographyH5 className="col-span-3">Additional Information</TypographyH5>

        <div className="grid grid-cols-3 col-span-9 gap-6 items-start">
          <FormField
            control={control}
            name="remarks"
            render={({ field }) => (
              <FormItem className="col-span-3">
                <FormLabel>Remarks</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any additional notes or special instructions..."
                    value={field.value || ''}
                    onChange={field.onChange}
                    rows={4}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="requiresClientPresence"
            render={({ field }) => (
              <FormItem className="col-span-3 flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value || false} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="leading-none">
                  <FormLabel>Requires Client Presence at RTO</FormLabel>
                  <TypographyP className="text-xs text-muted-foreground">
                    Check if the client needs to be physically present for this service
                  </TypographyP>
                </div>
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
};

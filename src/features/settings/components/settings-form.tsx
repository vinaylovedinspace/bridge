'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar, Clock, MapPin, IndianRupee, Smartphone } from 'lucide-react';
import { RTOOfficeSelect } from '@/components/ui/rto-office-select';
import { toast } from 'sonner';
import { branchSettingsSchema, type BranchSettings } from '../types';
import { updateBranchSettings } from '../server/actions';
import {
  DEFAULT_WORKING_DAYS,
  DEFAULT_OPERATING_HOURS,
  DAYS_OF_WEEK,
} from '@/lib/constants/business';
import { BranchConfig } from '@/server/action/branch';
import { useSetAtom } from 'jotai';
import { branchConfigAtom } from '@/lib/atoms/branch-config';

interface SettingsFormProps {
  branchId: string;
  initialData?: BranchConfig;
}

export const SettingsForm = ({ branchId, initialData }: SettingsFormProps) => {
  const [isPending, setIsPending] = useState(false);
  const setBranchConfig = useSetAtom(branchConfigAtom);

  const form = useForm<BranchSettings>({
    resolver: zodResolver(branchSettingsSchema),
    defaultValues: {
      workingDays: initialData?.workingDays || DEFAULT_WORKING_DAYS,
      operatingHours: initialData?.operatingHours || DEFAULT_OPERATING_HOURS,
      defaultRtoOffice: initialData?.defaultRtoOffice || '',
      licenseServiceCharge: initialData?.licenseServiceCharge || 500,
      digilockerFlowPreference: initialData?.digilockerFlowPreference || 'manager',
    },
  });

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = form;
  const workingDays = watch('workingDays');
  const defaultRtoOffice = watch('defaultRtoOffice');

  const handleWorkingDayToggle = (dayId: number) => {
    const currentDays = workingDays || [];
    const newDays = currentDays.includes(dayId)
      ? currentDays.filter((id) => id !== dayId)
      : [...currentDays, dayId].sort();
    setValue('workingDays', newDays);
  };

  const onSubmit = async (data: BranchSettings) => {
    setIsPending(true);
    try {
      const result = await updateBranchSettings(branchId, data);
      if (result.success) {
        // Update the atom with new values
        setBranchConfig((prev) => ({
          ...prev!,
          workingDays: data.workingDays,
          operatingHours: data.operatingHours,
          defaultRtoOffice: data.defaultRtoOffice || null,
          licenseServiceCharge: data.licenseServiceCharge ?? 0,
          digilockerFlowPreference: data.digilockerFlowPreference || 'manager',
        }));

        toast.success(result.message);

        // If sessions were rescheduled, show additional info
        if (result.sessionsUpdated && result.sessionsUpdated > 0) {
          setTimeout(() => {
            toast.info(
              `${result.sessionsUpdated} sessions were rescheduled. Please refresh the Sessions page to see the updated schedule.`,
              {
                duration: 8000, // Show longer for important info
              }
            );
          }, 1000);
        }
      } else {
        toast.error(result.error || 'Failed to update settings');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Working Days Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-gray-700">
              <Calendar className="h-5 w-5" />
              Working Days
            </CardTitle>
            <CardDescription>Select which days of the week your branch operates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-7 gap-4">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.id} className="flex flex-col items-center space-y-3">
                  <Label htmlFor={`day-${day.id}`} className="text-sm font-medium text-center">
                    {day.short}
                  </Label>
                  <Checkbox
                    id={`day-${day.id}`}
                    checked={workingDays?.includes(day.id) || false}
                    onCheckedChange={() => handleWorkingDayToggle(day.id)}
                    className="h-5 w-5"
                  />
                </div>
              ))}
            </div>
            {errors.workingDays && (
              <p className="text-sm text-destructive mt-2">{errors.workingDays.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Operating Hours Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-gray-700">
              <Clock className="h-5 w-5" />
              Operating Hours
            </CardTitle>
            <CardDescription>Set the daily operating hours for session scheduling</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  className="h-10"
                  {...register('operatingHours.start')}
                />
                {errors.operatingHours?.start && (
                  <p className="text-sm text-destructive">{errors.operatingHours.start.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  className="h-10"
                  {...register('operatingHours.end')}
                />
                {errors.operatingHours?.end && (
                  <p className="text-sm text-destructive">{errors.operatingHours.end.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default RTO Office Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-gray-700">
              <MapPin className="h-5 w-5" />
              Default RTO Office
            </CardTitle>
            <CardDescription>
              Set the default RTO office for new RTO service applications from this branch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default-rto-office">RTO Office</Label>
              <RTOOfficeSelect
                value={defaultRtoOffice || ''}
                onValueChange={(value) => setValue('defaultRtoOffice', value)}
                placeholder="Select default RTO office..."
              />
              {errors.defaultRtoOffice && (
                <p className="text-sm text-destructive">{errors.defaultRtoOffice.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* License Service Fee Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-gray-700">
              <IndianRupee className="h-5 w-5" />
              Licence Service Fee
            </CardTitle>
            <CardDescription>
              Set the service fee amount charged for handling licence applications for
              students/clients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="license-service-charge">Service Fee Amount (₹)</Label>
              <Input
                id="license-service-charge"
                type="number"
                min="0"
                max="99999"
                step="1"
                placeholder="Enter service fee amount"
                className="h-10"
                {...register('licenseServiceCharge', { valueAsNumber: true })}
              />
              {errors.licenseServiceCharge && (
                <p className="text-sm text-destructive">{errors.licenseServiceCharge.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Digilocker Flow Preference Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-gray-700">
              <Smartphone className="h-5 w-5" />
              Digilocker Auto-fill Preference
            </CardTitle>
            <CardDescription>
              Set who will complete the Digilocker verification during admission
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <Label>Default Flow Type</Label>
              <RadioGroup
                value={watch('digilockerFlowPreference')}
                onValueChange={(value) =>
                  setValue('digilockerFlowPreference', value as 'manager' | 'client')
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manager" id="manager-flow" />
                  <Label htmlFor="manager-flow" className="font-normal cursor-pointer">
                    Manager
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="client" id="client-flow" />
                  <Label htmlFor="client-flow" className="font-normal cursor-pointer">
                    Client
                  </Label>
                </div>
              </RadioGroup>
              {errors.digilockerFlowPreference && (
                <p className="text-sm text-destructive">
                  {errors.digilockerFlowPreference.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Floating Save Button - Centered in container */}
        <div className="sticky bottom-6 flex justify-center z-50">
          <Button type="submit" size="lg" disabled={isPending} className="min-w-[140px] shadow-lg">
            {isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
};

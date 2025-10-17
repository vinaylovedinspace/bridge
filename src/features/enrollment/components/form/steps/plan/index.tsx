'use client';

import { useFormContext } from 'react-hook-form';
import { useState, useEffect, useCallback } from 'react';
import { AdmissionFormValues } from '@/features/enrollment/types';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Button } from '@/components/ui/button';
import { LockIcon } from 'lucide-react';
import { SessionAvailabilityModal } from './session-availability-modal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSlotAvailability } from '@/features/enrollment/hooks/use-slot-availability';
import { useSessionValidation } from '@/features/enrollment/hooks/use-session-validation';
import { VehicleSelection } from './vehicle-selection';
import { SessionDetails } from './session-details';
import { SlotStatusDisplay } from './slot-status-display';
import { branchWorkingDaysAtom } from '@/lib/atoms/branch-config';
import { useAtomValue } from 'jotai';

export const PlanStep = () => {
  const { control, watch, setValue } = useFormContext<AdmissionFormValues>();
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const branchWorkingDays = useAtomValue(branchWorkingDaysAtom);

  const selectedVehicleId = watch('plan.vehicleId');
  const selectedDateTime = watch('plan.joiningDate');
  const numberOfSessions = watch('plan.numberOfSessions');
  const currentClientId = watch('client.id');

  const { slotConflict, checkSlotAvailability } = useSlotAvailability(currentClientId);
  const { hasStartedSessions, isTimeOutsideOperatingHours } = useSessionValidation(
    currentClientId,
    selectedDateTime
  );

  useEffect(() => {
    if (selectedVehicleId && selectedDateTime && !isTimeOutsideOperatingHours) {
      checkSlotAvailability(selectedVehicleId, selectedDateTime);
    }
  }, [selectedVehicleId, selectedDateTime, isTimeOutsideOperatingHours, checkSlotAvailability]);

  const handleAvailabilityModalClose = useCallback(() => {
    setShowAvailabilityModal(false);
  }, []);

  return (
    <div className="space-y-10">
      {hasStartedSessions && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <LockIcon className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Plan details are locked</p>
            <p>
              Sessions have already started for this client. You cannot modify the vehicle, number
              of sessions, or joining date/time.
            </p>
          </div>
        </div>
      )}
      <VehicleSelection disabled={hasStartedSessions} />
      <SessionDetails disabled={hasStartedSessions} />
      <div className="grid grid-cols-12">
        <span className="col-span-3" />
        <div className="grid grid-cols-3 col-span-9 gap-6">
          <div className="space-y-3">
            <FormField
              control={control}
              name="plan.joiningDate"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel required>Joining Date & Time</FormLabel>
                    {hasStartedSessions && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center text-amber-500">
                              <LockIcon className="h-4 w-4" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">
                              Date and time cannot be changed because sessions have already started
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <FormControl>
                    <div className={hasStartedSessions ? 'pointer-events-none opacity-50' : ''}>
                      <DateTimePicker
                        selected={field.value}
                        onChange={field.onChange}
                        placeholderText="Select joining date and time"
                        minDate={new Date()}
                        maxDate={new Date(2100, 0, 1)}
                        disableDateChange={hasStartedSessions}
                        workingDays={branchWorkingDays}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedDateTime && selectedVehicleId && (
              <SlotStatusDisplay
                isTimeOutsideOperatingHours={isTimeOutsideOperatingHours}
                slotConflict={slotConflict}
              />
            )}

            {selectedVehicleId && (
              <Button
                type="button"
                variant="outline"
                className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => setShowAvailabilityModal(true)}
                disabled={hasStartedSessions}
              >
                Session availability
              </Button>
            )}
          </div>
        </div>
      </div>

      <SessionAvailabilityModal
        isOpen={showAvailabilityModal}
        onClose={handleAvailabilityModalClose}
        vehicleId={selectedVehicleId}
        selectedDate={selectedDateTime}
        currentClientId={currentClientId}
        numberOfSessions={numberOfSessions || 1}
        hasStartedSessions={hasStartedSessions}
        onTimeSelect={(timeValue: string) => {
          const [hours, minutes] = timeValue.split(':').map(Number);
          const newDateTime = new Date(selectedDateTime);
          newDateTime.setHours(hours, minutes, 0, 0);
          setValue('plan.joiningDate', newDateTime);
        }}
      />
    </div>
  );
};

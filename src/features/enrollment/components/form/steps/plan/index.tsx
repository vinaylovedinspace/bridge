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
import { BranchConfig } from '@/server/db/branch';

type PlanStepProps = {
  branchConfig: BranchConfig;
  currentClientId?: string;
};

export const PlanStep = ({ branchConfig, currentClientId }: PlanStepProps) => {
  const { control, watch, setValue } = useFormContext<AdmissionFormValues>();
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  const selectedVehicleId = watch('plan.vehicleId');
  const selectedDateTime = watch('plan.joiningDate');
  const numberOfSessions = watch('plan.numberOfSessions');

  const { slotConflict, checkSlotAvailability } = useSlotAvailability(
    branchConfig,
    currentClientId
  );
  const { hasCompletedSessions, isTimeOutsideOperatingHours } = useSessionValidation(
    branchConfig,
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
      <VehicleSelection />
      <SessionDetails />
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
                    {hasCompletedSessions && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center text-amber-500">
                              <LockIcon className="h-4 w-4" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">
                              Date cannot be changed because there are completed sessions
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <FormControl>
                    <DateTimePicker
                      selected={field.value}
                      onChange={field.onChange}
                      placeholderText="Select joining date and time"
                      maxDate={new Date(2100, 0, 1)}
                      disableDateChange={hasCompletedSessions}
                      workingDays={branchConfig.workingDays}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedDateTime && selectedVehicleId && (
              <SlotStatusDisplay
                isTimeOutsideOperatingHours={isTimeOutsideOperatingHours}
                slotConflict={slotConflict}
                branchConfig={branchConfig}
              />
            )}

            {selectedVehicleId && (
              <Button
                type="button"
                variant="outline"
                className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => setShowAvailabilityModal(true)}
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
        branchConfig={branchConfig}
        currentClientId={currentClientId}
        numberOfSessions={numberOfSessions || 1}
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

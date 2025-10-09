import { branchOperatingHoursAtom } from '@/lib/atoms/branch-config';
import { useAtomValue } from 'jotai';
import { CheckCircle, AlertTriangle } from 'lucide-react';

type SlotConflict = {
  hasConflict: boolean;
  availableSlots: string[];
};

type SlotStatusDisplayProps = {
  isTimeOutsideOperatingHours: boolean;
  slotConflict: SlotConflict;
};

export const SlotStatusDisplay = ({
  isTimeOutsideOperatingHours,
  slotConflict,
}: SlotStatusDisplayProps) => {
  const branchOperatingHours = useAtomValue(branchOperatingHoursAtom);
  if (isTimeOutsideOperatingHours) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <AlertTriangle className="h-4 w-4" />
        <span>
          Selected time must be within operating hours ({branchOperatingHours?.start} -{' '}
          {branchOperatingHours?.end})
        </span>
      </div>
    );
  }

  if (slotConflict.hasConflict) {
    return (
      <div className="p-3 border border-orange-200 bg-orange-50 rounded-md">
        <div className="flex gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="text-orange-800">
            <div className="space-y-2">
              <p className="font-medium">Slot Not Available</p>
              <p className="text-sm">
                The selected time slot is already occupied. Here are some available options:
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {slotConflict.availableSlots.map((slot, index) => (
                  <div key={index} className="flex items-center gap-1 text-sm">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>{slot}</span>
                  </div>
                ))}
              </div>
              {slotConflict.availableSlots.length === 0 && (
                <p className="text-sm text-orange-700">
                  No available slots for this date. Please select a different date.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-green-600">
      <CheckCircle className="h-4 w-4" />
      <span>Time slot available</span>
    </div>
  );
};

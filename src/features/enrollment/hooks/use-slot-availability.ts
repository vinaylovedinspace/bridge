import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { getSessions } from '@/server/action/sessions';
import { generateTimeSlots, checkTimeSlotConflict } from '@/lib/sessions';
import { useAtomValue } from 'jotai';
import { branchOperatingHoursAtom } from '@/lib/atoms/branch-config';
import { normalizeTimeString } from '@/lib/date-time-utils';

type SlotConflict = {
  hasConflict: boolean;
  availableSlots: string[];
};

export const useSlotAvailability = (currentClientId?: string) => {
  const branchOperatingHours = useAtomValue(branchOperatingHoursAtom);
  const [slotConflict, setSlotConflict] = useState<SlotConflict>({
    hasConflict: false,
    availableSlots: [],
  });

  const checkSlotAvailability = useCallback(
    async (vehicleId: string, dateTime: Date) => {
      if (!vehicleId || !dateTime) return;

      const selectedDate = format(dateTime, 'yyyy-MM-dd');
      const selectedTime = format(dateTime, 'HH:mm');

      // Check for conflict using shared utility
      const conflictResult = await checkTimeSlotConflict({
        vehicleId,
        date: selectedDate,
        time: selectedTime,
        excludeClientId: currentClientId,
        getSessionsFn: getSessions,
      });

      if (conflictResult.hasConflict) {
        // Fetch sessions to calculate nearby available slots
        const sessions = await getSessions(vehicleId);
        const allTimeSlots = generateTimeSlots(branchOperatingHours);
        const occupiedSlots = sessions
          .filter((session) => {
            const sessionDate = session.sessionDate;
            const isCurrentClientSession = currentClientId && session.clientId === currentClientId;
            return sessionDate === selectedDate && !isCurrentClientSession;
          })
          .map((session) => normalizeTimeString(session.startTime));

        const selectedTimeIndex = allTimeSlots.findIndex((slot) => slot.value === selectedTime);

        const nearbySlots: string[] = [];
        for (let i = selectedTimeIndex - 2; i <= selectedTimeIndex + 2; i++) {
          if (i >= 0 && i < allTimeSlots.length && i !== selectedTimeIndex) {
            const slot = allTimeSlots[i];
            if (!occupiedSlots.includes(slot.value)) {
              nearbySlots.push(slot.label);
            }
          }
        }

        if (nearbySlots.length < 4) {
          const additionalSlots = allTimeSlots
            .filter(
              (slot) => !occupiedSlots.includes(slot.value) && !nearbySlots.includes(slot.label)
            )
            .slice(0, 4 - nearbySlots.length)
            .map((slot) => slot.label);
          nearbySlots.push(...additionalSlots);
        }

        setSlotConflict({
          hasConflict: true,
          availableSlots: nearbySlots.slice(0, 4),
        });
      } else {
        setSlotConflict({ hasConflict: false, availableSlots: [] });
      }
    },
    [branchOperatingHours, currentClientId]
  );

  return {
    slotConflict,
    checkSlotAvailability,
  };
};

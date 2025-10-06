import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { getSessions } from '@/server/actions/sessions';
import { generateTimeSlots } from '@/lib/sessions';
import { useAtomValue } from 'jotai';
import { branchOperatingHoursAtom } from '@/lib/atoms/branch-config';

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

      try {
        const sessions = await getSessions(vehicleId);

        const selectedDate = format(dateTime, 'yyyy-MM-dd');
        const selectedTime = format(dateTime, 'HH:mm');

        const conflictSession = sessions.find((session) => {
          const sessionDate = session.sessionDate;
          const sessionTime = session.startTime.substring(0, 5);
          const isCurrentClientSession = currentClientId && session.clientId === currentClientId;
          return (
            sessionDate === selectedDate && sessionTime === selectedTime && !isCurrentClientSession
          );
        });

        if (conflictSession) {
          const allTimeSlots = generateTimeSlots(branchOperatingHours);
          const occupiedSlots = sessions
            .filter((session) => {
              const sessionDate = session.sessionDate;
              const isCurrentClientSession =
                currentClientId && session.clientId === currentClientId;
              return sessionDate === selectedDate && !isCurrentClientSession;
            })
            .map((session) => session.startTime.substring(0, 5));

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
      } catch (error) {
        console.error('Error checking slot availability:', error);
      }
    },
    [branchOperatingHours, currentClientId]
  );

  return {
    slotConflict,
    checkSlotAvailability,
  };
};

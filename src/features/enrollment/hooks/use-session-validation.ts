import { useState, useEffect } from 'react';
import { getSessionsByClientId } from '@/server/action/sessions';
import { isTimeWithinOperatingHours } from '@/lib/date-time-utils';
import { useAtomValue } from 'jotai';
import { branchOperatingHoursAtom } from '@/lib/atoms/branch-config';

export const useSessionValidation = (currentClientId?: string, selectedDateTime?: Date) => {
  const branchOperatingHours = useAtomValue(branchOperatingHoursAtom);

  const [hasStartedSessions, setHasStartedSessions] = useState(false);

  const isTimeOutsideOperatingHours = Boolean(
    selectedDateTime &&
      !isTimeWithinOperatingHours(
        selectedDateTime.getHours(),
        selectedDateTime.getMinutes(),
        branchOperatingHours
      )
  );

  useEffect(() => {
    if (currentClientId) {
      getSessionsByClientId(currentClientId)
        .then((sessions) => {
          // Check if any session has been started (IN_PROGRESS, COMPLETED, NO_SHOW)
          const hasStarted = sessions.some(
            (session) =>
              session.status === 'COMPLETED' ||
              session.status === 'IN_PROGRESS' ||
              session.status === 'NO_SHOW'
          );
          setHasStartedSessions(hasStarted);
        })
        .catch((error) => {
          console.error('Error checking started sessions:', error);
          setHasStartedSessions(false);
        });
    }
  }, [currentClientId]);

  return {
    hasCompletedSessions: hasStartedSessions, // Keep for backward compatibility
    hasStartedSessions,
    isTimeOutsideOperatingHours,
  };
};

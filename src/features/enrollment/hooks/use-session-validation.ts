import { useState, useEffect } from 'react';
import { getSessionsByClientId } from '@/server/actions/sessions';
import { isTimeWithinOperatingHours } from '@/lib/utils/date-utils';
import { useAtomValue } from 'jotai';
import { branchOperatingHoursAtom } from '@/lib/atoms/branch-config';

export const useSessionValidation = (currentClientId?: string, selectedDateTime?: Date) => {
  const branchOperatingHours = useAtomValue(branchOperatingHoursAtom);

  const [hasCompletedSessions, setHasCompletedSessions] = useState(false);

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
          const completed = sessions.some((session) => session.status === 'COMPLETED');
          setHasCompletedSessions(completed);
        })
        .catch((error) => {
          console.error('Error checking completed sessions:', error);
          setHasCompletedSessions(false);
        });
    }
  }, [currentClientId]);

  return {
    hasCompletedSessions,
    isTimeOutsideOperatingHours,
  };
};

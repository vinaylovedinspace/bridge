import { useState, useEffect } from 'react';
import { getSessionsByClientId } from '@/server/actions/sessions';
import { isTimeWithinOperatingHours } from '@/lib/utils/date-utils';
import { BranchConfig } from '@/server/db/branch';

export const useSessionValidation = (
  branchConfig: BranchConfig,
  currentClientId?: string,
  selectedDateTime?: Date
) => {
  const [hasCompletedSessions, setHasCompletedSessions] = useState(false);

  const isTimeOutsideOperatingHours = Boolean(
    selectedDateTime &&
      !isTimeWithinOperatingHours(
        selectedDateTime.getHours(),
        selectedDateTime.getMinutes(),
        branchConfig.operatingHours!
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

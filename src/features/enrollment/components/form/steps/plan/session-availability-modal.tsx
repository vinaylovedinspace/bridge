'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, X } from 'lucide-react';
import { getSessions } from '@/server/actions/sessions';
import type { Session } from '@/server/db/sessions';
import { BranchConfig } from '@/server/db/branch';
import { generateTimeSlots } from '@/lib/sessions';

type SessionAvailabilityModalProps = {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  selectedDate: Date;
  branchConfig: BranchConfig;
  onTimeSelect?: (time: string) => void;
  currentClientId?: string; // To highlight current client's sessions
  numberOfSessions?: number; // Number of sessions to check availability for
};

export const SessionAvailabilityModal = ({
  isOpen,
  onClose,
  vehicleId,
  selectedDate,
  branchConfig,
  onTimeSelect,
  currentClientId,
  numberOfSessions = 1,
}: SessionAvailabilityModalProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const timeSlots = generateTimeSlots(branchConfig.operatingHours!);
  const selectedDateStr = format(selectedDate ?? new Date(), 'yyyy-MM-dd');

  // Get session details for each time slot on the selected date
  const sessionsByTimeSlot = sessions
    .filter((session) => {
      const sessionDate = session.sessionDate; // Already in YYYY-MM-DD format
      return sessionDate === selectedDateStr;
    })
    .reduce(
      (acc, session) => {
        const timeKey = session.startTime.substring(0, 5);
        acc[timeKey] = session;
        return acc;
      },
      {} as Record<string, Session>
    );

  // Function to get availability details for a time slot
  const getSlotAvailabilityDetails = useCallback(
    (timeSlot: string) => {
      if (numberOfSessions <= 1) {
        return {
          isFullyAvailable: !sessionsByTimeSlot[timeSlot],
          availableSessions: sessionsByTimeSlot[timeSlot] ? 0 : 1,
          totalSessions: 1,
          conflictingSession: sessionsByTimeSlot[timeSlot],
        };
      }

      // Generate all session dates and check each one
      const sessionDates: Date[] = [];
      let currentDate = new Date(selectedDate);
      let sessionsScheduled = 0;

      while (sessionsScheduled < numberOfSessions && currentDate <= addDays(selectedDate, 365)) {
        const dayOfWeek = currentDate.getDay();

        if (branchConfig.workingDays?.includes(dayOfWeek)) {
          sessionDates.push(new Date(currentDate));
          sessionsScheduled++;
        }

        currentDate = addDays(currentDate, 1);
      }

      let availableSessions = 0;
      let firstConflictingSession: Session | null = null;

      for (const sessionDate of sessionDates) {
        const dateStr = format(sessionDate, 'yyyy-MM-dd');
        const conflictingSession = sessions.find((session) => {
          const sessionDateStr = session.sessionDate; // Already in YYYY-MM-DD format
          const sessionTime = session.startTime.substring(0, 5);
          return sessionDateStr === dateStr && sessionTime === timeSlot;
        });

        if (conflictingSession) {
          if (!firstConflictingSession) {
            firstConflictingSession = conflictingSession;
          }
        } else {
          availableSessions++;
        }
      }

      return {
        isFullyAvailable: availableSessions === sessionDates.length,
        availableSessions,
        totalSessions: sessionDates.length,
        conflictingSession: firstConflictingSession || sessionsByTimeSlot[timeSlot],
      };
    },
    [sessions, selectedDate, numberOfSessions, branchConfig.workingDays, sessionsByTimeSlot]
  );

  const loadSessions = useCallback(async () => {
    if (!vehicleId) return;

    setLoading(true);
    try {
      const sessionData = await getSessions(vehicleId);
      setSessions(sessionData);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (isOpen && vehicleId) {
      loadSessions();
    }
  }, [isOpen, loadSessions, vehicleId]);

  const handleTimeSelect = (
    timeValue: string,
    isPartiallyAvailable?: boolean,
    availabilityDetails?: { availableSessions: number; totalSessions: number }
  ) => {
    if (isPartiallyAvailable && numberOfSessions > 1) {
      // Show warning for partially available slots
      const availableCount = availabilityDetails?.availableSessions || 0;
      const totalCount = availabilityDetails?.totalSessions || 0;

      const message = `This time slot is only available for ${availableCount} out of ${totalCount} sessions.\n\nSome sessions will have scheduling conflicts that you'll need to resolve manually.\n\nDo you want to proceed anyway?`;

      if (window.confirm(message)) {
        if (onTimeSelect) {
          onTimeSelect(timeValue);
        }
        onClose();
      }
    } else {
      // Proceed normally for fully available slots
      if (onTimeSelect) {
        onTimeSelect(timeValue);
      }
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            Session Availability - {format(selectedDate, 'PPP')}
            {numberOfSessions > 1 && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({numberOfSessions} sessions)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              Operating Hours: {branchConfig.operatingHours?.start} -{' '}
              {branchConfig.operatingHours?.end}
            </div>
            {numberOfSessions > 1 && selectedDate && (
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                <strong>Note:</strong> Checking availability for all {numberOfSessions} sessions
                starting from {format(selectedDate, 'PPP')}. Partially available slots can be
                selected, but you&apos;ll need to handle conflicts for specific days.
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-500">Loading availability...</div>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-4 gap-3">
                {timeSlots.map((slot) => {
                  const availabilityDetails = getSlotAvailabilityDetails(slot.value);
                  const isFullyAvailable = availabilityDetails.isFullyAvailable;
                  const isPartiallyAvailable =
                    availabilityDetails.availableSessions > 0 && !isFullyAvailable;
                  const sessionForSlot = availabilityDetails.conflictingSession;
                  const isCurrentClient = sessionForSlot?.clientId === currentClientId;

                  let bgColor, borderColor, textColor, hoverColor;
                  if (isFullyAvailable) {
                    bgColor = 'bg-green-50';
                    borderColor = 'border-green-200';
                    textColor = 'text-green-800';
                    hoverColor = 'hover:bg-green-100';
                  } else if (isPartiallyAvailable) {
                    bgColor = 'bg-yellow-50';
                    borderColor = 'border-yellow-200';
                    textColor = 'text-yellow-800';
                    hoverColor = 'hover:bg-yellow-100';
                  } else if (isCurrentClient) {
                    bgColor = 'bg-blue-50';
                    borderColor = 'border-blue-200';
                    textColor = 'text-blue-800';
                    hoverColor = '';
                  } else {
                    bgColor = 'bg-red-50';
                    borderColor = 'border-red-200';
                    textColor = 'text-red-800';
                    hoverColor = '';
                  }

                  const canSelect = isFullyAvailable || isPartiallyAvailable;

                  return (
                    <div
                      key={slot.value}
                      className={`
                        p-2 rounded-lg border text-center transition-colors min-h-[90px] flex flex-col justify-between
                        ${bgColor} ${borderColor} ${textColor}
                        ${canSelect ? `cursor-pointer ${hoverColor}` : 'cursor-not-allowed'}
                      `}
                      onClick={() =>
                        canSelect &&
                        handleTimeSelect(slot.value, isPartiallyAvailable, availabilityDetails)
                      }
                    >
                      <div className="flex items-center justify-center gap-1 mb-1">
                        {isFullyAvailable ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : isPartiallyAvailable ? (
                          <div className="h-3 w-3 rounded-full border-2 border-yellow-600 bg-yellow-200"></div>
                        ) : (
                          <X className="h-3 w-3 text-red-600" />
                        )}
                      </div>

                      <div className="text-xs font-medium">{slot.label}</div>

                      <div className="text-xs mt-1">
                        {isFullyAvailable ? (
                          <div>
                            <div className="font-medium">Available</div>
                            {numberOfSessions > 1 && (
                              <div className="text-green-600 text-xs">All {numberOfSessions}</div>
                            )}
                          </div>
                        ) : isPartiallyAvailable ? (
                          <div>
                            <div className="font-medium">Partial</div>
                            <div className="text-yellow-700 text-xs">
                              {availabilityDetails.availableSessions}/
                              {availabilityDetails.totalSessions}
                            </div>
                          </div>
                        ) : isCurrentClient ? (
                          <div>
                            <div className="font-medium text-blue-700">Your Session</div>
                            <div className="text-blue-600 text-xs truncate">
                              {sessionForSlot?.clientName?.split(' ')[0]}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-red-700 text-xs">Occupied</div>
                            <div className="font-medium text-red-600 text-xs truncate">
                              {sessionForSlot?.clientName?.split(' ')[0]}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {timeSlots.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No time slots available for the current operating hours.</p>
                  <p className="text-sm mt-2">
                    Operating Hours: {branchConfig.operatingHours?.start} -{' '}
                    {branchConfig.operatingHours?.end}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Fully Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full border-2 border-yellow-600 bg-yellow-200"></div>
                <span>Partially Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded border-2 border-blue-200 bg-blue-50"></div>
                <span>Your Session</span>
              </div>
              <div className="flex items-center gap-1">
                <X className="h-4 w-4 text-red-600" />
                <span>Occupied</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

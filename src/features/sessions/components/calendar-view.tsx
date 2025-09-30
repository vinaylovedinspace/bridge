'use client';

import { useState, useMemo, useCallback } from 'react';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Trash2 } from 'lucide-react';
import { useVehicles } from '@/hooks/vehicles';
import { useSessions } from '../hooks/sessions';
import { useBranchSettings } from '@/features/settings/hooks/settings';
import { updateSession, cancelSession, assignSessionToSlot } from '@/server/actions/sessions';
import type { Session } from '@/server/db/sessions';
import { dateToString, formatDateForDisplay } from '@/lib/date-utils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PopConfirm } from '@/components/ui/pop-confirm';
import { cn } from '@/lib/utils';
import { SessionTimeEditor } from './session-time-editor';
import { SessionAssignmentModal } from './session-assignment-modal';
import {
  getAvatarColor,
  getStatusStyles,
  calculateEndTime,
  formatTimeSlot,
  WEEK_START_DAY,
  DAYS_IN_WEEK,
} from '../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { generateTimeSlots } from '@/lib/sessions';

export const CalendarView = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    time: string;
    hour: number;
    minute: number;
    date?: Date;
  } | null>(null);

  const { data: vehicles, isLoading } = useVehicles();
  const { data: sessions = [], mutate } = useSessions(selectedVehicle);
  const { data: branchSettings, isLoading: isLoadingSettings } = useBranchSettings();

  // Generate time slots based on branch settings
  const timeSlots = useMemo(() => {
    if (!branchSettings) return [];

    return generateTimeSlots(branchSettings.operatingHours);
  }, [branchSettings]);

  // Generate week dates for week view - memoized for performance
  const weekDates = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: WEEK_START_DAY });
    return Array.from({ length: DAYS_IN_WEEK }, (_, i) => addDays(weekStart, i));
  }, [selectedDate]);

  const getSessionForSlot = useCallback(
    (timeSlot: { hour: number; minute: number }, date?: Date) => {
      const targetDate = date || selectedDate;
      const selectedDateStr = format(targetDate, 'yyyy-MM-dd');
      const formattedTimeSlot = `${formatTimeSlot(timeSlot.hour, timeSlot.minute)}:00`;
      const formattedTimeSlotShort = formatTimeSlot(timeSlot.hour, timeSlot.minute);

      // Find the session that matches both date and time
      return sessions.find((session) => {
        const dateMatch = session.sessionDate === selectedDateStr;
        const timeMatch =
          session.startTime === formattedTimeSlot || session.startTime === formattedTimeSlotShort;
        return dateMatch && timeMatch;
      });
    },
    [sessions, selectedDate]
  );

  const handleSessionClick = useCallback((session: Session) => {
    setSelectedSession(session);
  }, []);

  const handleDeleteSession = useCallback(
    async (session: Session) => {
      try {
        const result = await cancelSession(session.id);

        if (!result.error) {
          mutate();
          setSelectedSession(null);
        } else {
          console.error('Failed to cancel session:', result.message);
        }
      } catch (error) {
        console.error('Error cancelling session:', error);
      }
    },
    [mutate]
  );

  const closeSessionModal = () => {
    setSelectedSession(null);
  };

  const handleEditTime = () => {
    setIsEditingTime(true);
  };

  const handleSaveTimeEdit = async (
    sessionId: string,
    newStartTime: string,
    newEndTime: string
  ) => {
    try {
      const result = await updateSession(sessionId, {
        startTime: newStartTime,
        endTime: newEndTime,
      });

      if (!result.error) {
        // Refresh the sessions data
        mutate();
        setIsEditingTime(false);
        setSelectedSession(null);
      } else {
        console.error('Failed to update session:', result.message);
      }
    } catch (error) {
      console.error('Error updating session:', error);
    }
  };

  const handleCancelTimeEdit = () => {
    setIsEditingTime(false);
  };

  const handleEmptySlotClick = (
    timeSlot: { time: string; hour: number; minute: number },
    date?: Date
  ) => {
    if (!selectedVehicle) {
      alert('Please select a vehicle first');
      return;
    }
    setSelectedTimeSlot({ ...timeSlot, date: date || selectedDate });
    setIsAssignmentModalOpen(true);
  };

  const handleSessionAssignment = useCallback(
    async (clientId: string) => {
      if (!selectedTimeSlot || !selectedVehicle) return;

      try {
        const startTime = formatTimeSlot(selectedTimeSlot.hour, selectedTimeSlot.minute);
        const endTime = calculateEndTime(selectedTimeSlot.hour, selectedTimeSlot.minute).formatted;

        const result = await assignSessionToSlot(
          clientId,
          selectedVehicle,
          dateToString(selectedTimeSlot.date || selectedDate),
          startTime,
          endTime
        );

        if (!result.error) {
          mutate();
          setIsAssignmentModalOpen(false);
          setSelectedTimeSlot(null);
        } else {
          alert(result.message);
        }
      } catch (error) {
        console.error('Error assigning session:', error);
        alert('Failed to assign session');
      }
    },
    [selectedTimeSlot, selectedVehicle, selectedDate, mutate]
  );

  const closeAssignmentModal = () => {
    setIsAssignmentModalOpen(false);
    setSelectedTimeSlot(null);
  };

  const isSessionEditable =
    selectedSession &&
    (selectedSession.status === 'SCHEDULED' || selectedSession.status === 'RESCHEDULED');

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="w-64 pt-4">
          <label className="block text-sm font-medium mb-2">Vehicle</label>
          <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
            <SelectTrigger>
              <SelectValue placeholder="Select Vehicle" />
            </SelectTrigger>
            <SelectContent>
              {isLoading ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  Loading vehicles...
                </div>
              ) : vehicles?.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No vehicles found
                </div>
              ) : (
                vehicles?.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Selector and Date Navigation */}
        <div className="flex items-center gap-4">
          {/* View Mode Dropdown */}
          <div className="w-32">
            <Select value={viewMode} onValueChange={(value: 'day' | 'week') => setViewMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, viewMode === 'week' ? -7 : -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="min-w-[140px] justify-start text-left font-normal"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {viewMode === 'week'
                    ? `${format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'dd MMM')} - ${format(endOfWeek(selectedDate, { weekStartsOn: 0 }), 'dd MMM yyyy')}`
                    : format(selectedDate, 'dd/MM/yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setIsCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, viewMode === 'week' ? 7 : 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border overflow-hidden bg-white">
        {isLoadingSettings ? (
          <div className="p-8 text-center text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Loading Schedule</h3>
            <p>Loading branch settings...</p>
          </div>
        ) : !selectedVehicle ? (
          <div className="p-8 text-center text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Select a Vehicle</h3>
            <p>Please select a vehicle from the dropdown above to view its session availability.</p>
          </div>
        ) : viewMode === 'day' ? (
          /* Day View */
          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
            {timeSlots.map((timeSlot, timeIndex) => {
              const [hour, minute] = timeSlot.value.split(':').map(Number);
              const session = getSessionForSlot({ hour, minute });
              return (
                <div key={timeIndex} className="flex items-center border-b border-gray-100 h-12">
                  {/* Time Column */}
                  <div className="w-24 p-4 text-sm text-gray-600 font-medium">{timeSlot.label}</div>

                  {/* Session Column */}
                  <div className="flex-1 h-full">
                    {session ? (
                      <div
                        className={cn(
                          'flex items-center gap-3 px-4 cursor-pointer hover:bg-blue-50 transition-colors h-12',
                          `border-l-4 ${getStatusStyles(session.status).borderColor}`
                        )}
                        onClick={() => handleSessionClick(session)}
                      >
                        {/* Avatar */}
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium',
                            getAvatarColor(session.clientName)
                          )}
                        >
                          {session.clientName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()}
                        </div>

                        {/* Client Name */}
                        <span className="font-medium text-gray-900">{session.clientName}</span>

                        {/* Status Indicator - only for completed and in-progress sessions */}
                        {session.status === 'COMPLETED' || session.status === 'IN_PROGRESS' ? (
                          <div className="flex items-center gap-1 ml-auto">
                            <div
                              className={`h-2 w-2 rounded-full ${getStatusStyles(session.status).dotColor}`}
                            ></div>
                            <span
                              className={`text-xs ${getStatusStyles(session.status).textColor}`}
                            >
                              {getStatusStyles(session.status).label}
                            </span>
                          </div>
                        ) : (
                          <div className="ml-auto"></div>
                        )}

                        {/* Session Time Range */}
                        <span className="text-sm text-gray-500 ml-1">
                          {session.startTime} - {session.endTime}
                        </span>
                      </div>
                    ) : (
                      <div
                        className="h-12 cursor-pointer hover:bg-blue-50 flex items-center justify-center text-gray-400 text-sm transition-colors border-2 border-dashed border-transparent hover:border-blue-300"
                        onClick={() => handleEmptySlotClick({ time: timeSlot.label, hour, minute })}
                        title="Click to assign a session"
                      ></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Week View */
          <div className="max-h-[calc(100vh-16rem)] overflow-auto">
            {/* Week Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
              <div className="flex">
                <div className="w-20 p-2 text-sm font-medium text-gray-600 border-r"></div>
                {weekDates.map((date, dayIndex) => (
                  <div
                    key={dayIndex}
                    className="flex-1 p-2 text-center border-r border-gray-100 last:border-r-0"
                  >
                    <div className="text-xs text-gray-500 uppercase">{format(date, 'EEE')}</div>
                    <div className="text-sm font-medium">{format(date, 'd')}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Slots */}
            {timeSlots.map((timeSlot, timeIndex) => (
              <div key={timeIndex} className="flex border-b border-gray-100">
                {/* Time Column */}
                <div className="w-20 p-2 text-xs text-gray-600 font-medium border-r border-gray-200 flex items-center">
                  {timeSlot.label}
                </div>

                {/* Day Columns */}
                {weekDates.map((date, dayIndex) => {
                  const [hour, minute] = timeSlot.value.split(':').map(Number);
                  const session = getSessionForSlot({ hour, minute }, date);
                  return (
                    <div
                      key={dayIndex}
                      className="flex-1 h-12 border-r border-gray-100 last:border-r-0"
                    >
                      {session ? (
                        <div
                          className={cn(
                            'h-full flex items-center gap-2 px-2 cursor-pointer hover:bg-blue-50 transition-colors',
                            `border-l-2 ${getStatusStyles(session.status).borderColor}`
                          )}
                          onClick={() => handleSessionClick(session)}
                        >
                          <div className="flex flex-col items-start justify-center">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  'w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium',
                                  getAvatarColor(session.clientName)
                                )}
                              >
                                {session.clientName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()}
                              </div>
                              <span className="text-xs font-medium text-gray-900 truncate">
                                {session.clientName.length > 12
                                  ? `${session.clientName.substring(0, 12)} ...`
                                  : session.clientName}
                              </span>
                            </div>
                            {/* Status indicator - only for completed and in-progress sessions */}
                            {session.status === 'COMPLETED' || session.status === 'IN_PROGRESS' ? (
                              <div className="flex items-center gap-1 ml-1 mt-1">
                                <div
                                  className={`h-2 w-2 rounded-full ${getStatusStyles(session.status).dotColor}`}
                                ></div>
                                <span
                                  className={`text-xs ${getStatusStyles(session.status).textColor}`}
                                >
                                  {getStatusStyles(session.status).label}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div
                          className="h-full cursor-pointer hover:bg-blue-50 transition-colors border-2 border-dashed border-transparent hover:border-blue-300"
                          onClick={() =>
                            handleEmptySlotClick({ time: timeSlot.label, hour, minute }, date)
                          }
                          title="Click to assign a session"
                        ></div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Detail Modal */}
      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && closeSessionModal()}>
        <DialogContent
          className="w-96 max-w-[90vw]"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 flex rounded-full items-center justify-center text-white font-medium',
                    getAvatarColor(selectedSession.clientName)
                  )}
                >
                  {selectedSession.clientName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </div>

                <div>
                  <p className="font-medium">{selectedSession.clientName}</p>
                  <p className="text-sm text-gray-500">
                    {formatDateForDisplay(selectedSession.sessionDate)}
                  </p>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Time:</strong> {selectedSession.startTime} - {selectedSession.endTime}
                </p>

                <p className="text-sm text-gray-600">
                  <strong>Session:</strong> #{selectedSession.sessionNumber}
                </p>
              </div>

              <div>
                {/* Enhanced Status Display - only for completed and in-progress sessions */}
                {selectedSession.status === 'COMPLETED' ||
                selectedSession.status === 'IN_PROGRESS' ? (
                  <div
                    className="flex items-center gap-2 rounded-md"
                    style={{
                      backgroundColor: `${getStatusStyles(selectedSession.status).borderColor}15`,
                    }}
                  >
                    <span
                      className={`font-medium ${getStatusStyles(selectedSession.status).textColor}`}
                    >
                      {getStatusStyles(selectedSession.status).label}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {isSessionEditable && (
            <DialogFooter className="flex jusitfy-between items-center w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={handleEditTime}>
                Edit Time
              </Button>

              <PopConfirm
                title="Cancel Session"
                description={`Are you sure you want to cancel this session with ${selectedSession.clientName} on ${formatDateForDisplay(selectedSession.sessionDate)} at ${selectedSession.startTime}? The session will be marked as cancelled and will be counted as an unassigned session.`}
                confirmText="Cancel Session"
                cancelText="Keep Session"
                onConfirm={() => handleDeleteSession(selectedSession)}
                variant="destructive"
              >
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </PopConfirm>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Session Time Editor Modal */}
      <SessionTimeEditor
        session={selectedSession}
        sessions={sessions}
        open={isEditingTime}
        onSave={handleSaveTimeEdit}
        onCancel={handleCancelTimeEdit}
      />

      {/* Session Assignment Modal */}
      <SessionAssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={closeAssignmentModal}
        onAssign={handleSessionAssignment}
        timeSlot={selectedTimeSlot?.time || ''}
        date={selectedTimeSlot?.date || selectedDate}
      />
    </div>
  );
};

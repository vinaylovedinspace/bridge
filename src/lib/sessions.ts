import { addDays, addMinutes, format, getDay, parse, set, isSameDay, addYears } from 'date-fns';
import { parseDate, formatDateToYYYYMMDD, normalizeTimeString } from './date-time-utils';
import { BranchConfig } from '@/server/actions/branch';

// ============================================================================
// Types
// ============================================================================

export type TimeSlot = {
  time: string;
  available: boolean;
  bookedBy?: string;
};

export type SessionBooking = {
  vehicleId: string;
  startDate: Date;
  timeSlot: string; // e.g., "17:30" for 5:30 PM
  numberOfSessions: number;
  sessionDurationInMinutes: number;
  clientId: string;
  clientName: string;
};

type SessionWithDate = {
  vehicleId: string;
  sessionDate: Date;
  startTime: string;
  endTime: string;
  status: string;
};

// ============================================================================
// Time Slot Generation & Formatting
// ============================================================================

/**
 * Generate time slots based on branch operating hours
 * @param operatingHours Operating hours with start and end time in HH:mm format
 * @param intervalMinutes Slot interval in minutes (default: 30)
 * @returns Array of time slots with value (HH:mm) and label (12-hour format)
 */
export const generateTimeSlots = (
  operatingHours: { start: string; end: string },
  intervalMinutes = 30
) => {
  const slots = [];

  // Parse start and end times using date-fns
  const baseDate = new Date(2000, 0, 1); // Use a base date for time calculations
  const [startHour, startMinute] = operatingHours.start.split(':').map(Number);
  const [endHour, endMinute] = operatingHours.end.split(':').map(Number);

  let currentTime = set(baseDate, { hours: startHour, minutes: startMinute, seconds: 0 });
  const endTime = set(baseDate, { hours: endHour, minutes: endMinute, seconds: 0 });

  // Generate slots within operating hours
  while (currentTime < endTime) {
    const timeString = format(currentTime, 'HH:mm');
    const displayTime = format(currentTime, 'h:mm a');

    slots.push({ value: timeString, label: displayTime });
    currentTime = addMinutes(currentTime, intervalMinutes);
  }

  return slots;
};

/**
 * Format time slot for display (e.g., "17:30" -> "5:30 PM")
 */
export const formatTimeSlot = (timeSlot: string): string => {
  const [hours, minutes] = timeSlot.split(':').map(Number);
  const date = set(new Date(), { hours, minutes, seconds: 0, milliseconds: 0 });
  return format(date, 'h:mm a');
};

/**
 * Parse display time back to 24-hour format (e.g., "5:30 PM" -> "17:30")
 */
export const parseDisplayTime = (displayTime: string): string => {
  const date = parse(displayTime, 'h:mm a', new Date());
  return format(date, 'HH:mm');
};

/**
 * Calculate end time based on start time and duration
 */
export const calculateEndTime = (startTime: string, durationInMinutes: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = set(new Date(), { hours, minutes, seconds: 0, milliseconds: 0 });
  const endDate = addMinutes(startDate, durationInMinutes);
  return format(endDate, 'HH:mm');
};

// ============================================================================
// Conflict Detection
// ============================================================================

/**
 * Find a conflicting session for a given date, time, and optional client exclusion
 * @param params Object containing sessions, targetDate, targetTime, and optional excludeClientId
 * @returns The conflicting session or undefined if no conflict exists
 */
export const findConflictingSession = <
  T extends { sessionDate: string; startTime: string; clientId?: string },
>(params: {
  sessions: T[];
  targetDate: string;
  targetTime: string;
  excludeClientId?: string;
}): T | undefined => {
  const { sessions, targetDate, targetTime, excludeClientId } = params;
  return sessions.find((session) => {
    const sessionDate = session.sessionDate;
    const sessionTime = normalizeTimeString(session.startTime);
    const isExcludedClient = excludeClientId && session.clientId === excludeClientId;
    return sessionDate === targetDate && sessionTime === targetTime && !isExcludedClient;
  });
};

/**
 * Check if a time slot has a conflict (for form validation)
 * @param params Object containing vehicleId, date, time, and optional excludeClientId
 * @returns Result object indicating if conflict exists and optional error message
 */
export async function checkTimeSlotConflict(params: {
  vehicleId: string;
  date: string;
  time: string;
  excludeClientId?: string;
  getSessionsFn: (
    vehicleId: string
  ) => Promise<Array<{ sessionDate: string; startTime: string; clientId?: string }>>;
}): Promise<{ hasConflict: boolean; message?: string }> {
  const { vehicleId, date, time, excludeClientId, getSessionsFn } = params;

  try {
    const sessions = await getSessionsFn(vehicleId);

    const conflictSession = findConflictingSession({
      sessions,
      targetDate: date,
      targetTime: time,
      excludeClientId,
    });

    if (conflictSession) {
      return {
        hasConflict: true,
        message:
          'The selected time slot is not available. Please choose an available time slot from the suggestions above.',
      };
    }

    return { hasConflict: false };
  } catch (error) {
    console.error('Error checking slot availability:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      hasConflict: true,
      message: `Unable to verify slot availability: ${errorMessage}`,
    };
  }
}

// ============================================================================
// Availability Checks
// ============================================================================

/**
 * Check if a date is a working day
 */
const isWorkingDay = (date: Date, branchConfig: BranchConfig): boolean => {
  const dayOfWeek = getDay(date);
  return branchConfig.workingDays?.includes(dayOfWeek) ?? false;
};

export const isTimeSlotAvailable = (
  vehicleId: string,
  date: Date,
  timeSlot: string,
  existingSessions: SessionWithDate[],
  branchConfig: BranchConfig
): boolean => {
  // Check if it's a working day
  if (!isWorkingDay(date, branchConfig)) return false;

  // Check for existing sessions
  const hasConflict = existingSessions.some(
    (session) =>
      session.vehicleId === vehicleId &&
      isSameDay(session.sessionDate, date) &&
      session.status !== 'CANCELLED' &&
      session.startTime === timeSlot
  );

  return !hasConflict;
};

// ============================================================================
// Session Scheduling
// ============================================================================

/**
 * Find the next available date starting from a given date
 */
const findNextAvailableDate = (
  startDate: Date,
  booking: SessionBooking,
  existingSessions: SessionWithDate[],
  branchConfig: BranchConfig,
  maxDays = 30
): Date | null => {
  let nextDate = new Date(startDate);

  for (let i = 0; i < maxDays; i++) {
    if (
      isTimeSlotAvailable(
        booking.vehicleId,
        nextDate,
        booking.timeSlot,
        existingSessions,
        branchConfig
      )
    ) {
      return nextDate;
    }
    nextDate = addDays(nextDate, 1);
  }

  return null;
};

/**
 * Get next available session dates for a client
 */
export const getNextAvailableSessionDates = (
  booking: SessionBooking,
  existingSessions: SessionWithDate[],
  branchConfig: BranchConfig
): Date[] => {
  const sessionDates: Date[] = [];
  let currentDate = new Date(booking.startDate);
  let sessionsScheduled = 0;

  // Try to schedule all sessions, skipping unavailable dates
  while (sessionsScheduled < booking.numberOfSessions) {
    if (
      isTimeSlotAvailable(
        booking.vehicleId,
        currentDate,
        booking.timeSlot,
        existingSessions,
        branchConfig
      )
    ) {
      sessionDates.push(new Date(currentDate));
      sessionsScheduled++;
    }
    currentDate = addDays(currentDate, 1);

    // Safety check to prevent infinite loop
    if (sessionDates.length === 0 && currentDate > addDays(booking.startDate, 365)) {
      throw new Error('Could not find available slots within a year');
    }
  }

  return sessionDates;
};

/**
 * Reschedule a missed session to the next available date
 */
export const rescheduleSession = (
  originalSessionDate: Date,
  booking: SessionBooking,
  existingSessions: SessionWithDate[],
  branchConfig: BranchConfig
): Date | null => {
  const nextDate = addDays(originalSessionDate, 1);
  return findNextAvailableDate(nextDate, booking, existingSessions, branchConfig, 30);
};

/**
 * Generate session dates from plan data
 */
export const generateSessionsFromPlan = (
  plan: {
    joiningDate: Date | string;
    joiningTime: string;
    numberOfSessions: number;
    vehicleId: string;
    planId: string;
  },
  client: {
    firstName: string;
    lastName: string;
    id: string;
  },
  branchConfig: BranchConfig,
  defaultDurationMinutes = 30
): Array<{
  clientId: string;
  clientName: string;
  vehicleId: string;
  planId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  sessionNumber: number;
}> => {
  const sessions = [];

  // Parse joining date
  const joiningDate = parseDate(plan.joiningDate);
  if (!joiningDate) {
    throw new Error('Invalid joining date provided');
  }

  // Start from joining date (timezone-safe)
  let currentDate = set(joiningDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });

  let sessionsScheduled = 0;
  let sessionNumber = 1;
  const maxDate = addYears(currentDate, 1);

  while (sessionsScheduled < plan.numberOfSessions && currentDate <= maxDate) {
    // Check if it's a working day
    if (isWorkingDay(currentDate, branchConfig)) {
      sessions.push({
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
        vehicleId: plan.vehicleId,
        planId: plan.planId,
        sessionDate: formatDateToYYYYMMDD(currentDate),
        startTime: plan.joiningTime,
        endTime: calculateEndTime(plan.joiningTime, defaultDurationMinutes),
        status: 'SCHEDULED' as const,
        sessionNumber,
      });

      sessionsScheduled++;
      sessionNumber++;
    }

    // Move to next day
    currentDate = addDays(currentDate, 1);
  }

  return sessions;
};

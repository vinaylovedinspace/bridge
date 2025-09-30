import { addDays, format, parse } from 'date-fns';
import { parseDate, dateToString } from './date-utils';
import { BranchConfig } from '@/server/db/branch';

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

// Generate time slots based on branch operating hours
export const generateTimeSlots = (operatingHours: { start: string; end: string }) => {
  const slots = [];

  // Parse start and end hours
  const [startHour, startMinute] = operatingHours.start.split(':').map(Number);
  const [endHour, endMinute] = operatingHours.end.split(':').map(Number);

  const startTime = startHour * 60 + startMinute; // Convert to minutes
  const endTime = endHour * 60 + endMinute; // Convert to minutes

  // Generate 30-minute slots within operating hours
  for (let timeInMinutes = startTime; timeInMinutes < endTime; timeInMinutes += 30) {
    const hour = Math.floor(timeInMinutes / 60);
    const minute = timeInMinutes % 60;

    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    slots.push({ value: timeString, label: displayTime });
  }

  return slots;
};

// Check if a time slot is available for a specific vehicle on a specific date
export const isTimeSlotAvailable = (
  vehicleId: string,
  date: Date,
  timeSlot: string,
  existingSessions: Array<{
    vehicleId: string;
    sessionDate: Date;
    startTime: string;
    endTime: string;
    status: string;
  }>,
  branchConfig: BranchConfig
): boolean => {
  // Check if it's a working day
  const dayOfWeek = date.getDay();
  if (!branchConfig.workingDays?.includes(dayOfWeek)) return false;

  // Check for existing sessions
  const conflictingSessions = existingSessions.filter(
    (session) =>
      session.vehicleId === vehicleId &&
      session.sessionDate.toDateString() === date.toDateString() &&
      session.status !== 'CANCELLED' &&
      session.startTime === timeSlot
  );

  return conflictingSessions.length === 0;
};

// Get next available session dates for a client
export const getNextAvailableSessionDates = (
  booking: SessionBooking,
  existingSessions: Array<{
    vehicleId: string;
    sessionDate: Date;
    startTime: string;
    endTime: string;
    status: string;
  }>,
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

// Calculate end time based on start time and duration
export const calculateEndTime = (startTime: string, durationInMinutes: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);

  const endDate = new Date(startDate.getTime() + durationInMinutes * 60000);
  return format(endDate, 'HH:mm');
};

// Reschedule a missed session to the next available date
export const rescheduleSession = (
  originalSessionDate: Date,
  booking: SessionBooking,
  existingSessions: Array<{
    vehicleId: string;
    sessionDate: Date;
    startTime: string;
    endTime: string;
    status: string;
  }>,
  branchConfig: BranchConfig
): Date | null => {
  let nextDate = addDays(originalSessionDate, 1);

  // Try to find the next available slot
  for (let i = 0; i < 30; i++) {
    // Try for next 30 days
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

  return null; // No available slot found in next 30 days
};

// Format time slot for display (e.g., "17:30" -> "5:30 PM")
export const formatTimeSlot = (timeSlot: string): string => {
  const [hours, minutes] = timeSlot.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return format(date, 'h:mm a');
};

// Parse display time back to 24-hour format (e.g., "5:30 PM" -> "17:30")
export const parseDisplayTime = (displayTime: string): string => {
  const date = parse(displayTime, 'h:mm a', new Date());
  return format(date, 'HH:mm');
};

// Generate session dates from plan data
export const generateSessionsFromPlan = (
  plan: {
    joiningDate: Date | string;
    joiningTime: string;
    numberOfSessions: number;
    vehicleId: string;
  },
  client: {
    firstName: string;
    lastName: string;
    id: string;
  },
  branchConfig: BranchConfig
): Array<{
  clientId: string;
  clientName: string;
  vehicleId: string;
  sessionDate: string; // YYYY-MM-DD string
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  sessionNumber: number;
}> => {
  const sessions = [];

  // Parse joining date using utility function (handles all formats)
  const joiningDate = parseDate(plan.joiningDate);
  if (!joiningDate) {
    throw new Error('Invalid joining date provided');
  }

  // Start from joining date (timezone-safe)
  let currentDate = new Date(
    joiningDate.getFullYear(),
    joiningDate.getMonth(),
    joiningDate.getDate()
  );

  let sessionsScheduled = 0;
  let sessionNumber = 1;

  while (sessionsScheduled < plan.numberOfSessions) {
    const dayOfWeek = currentDate.getDay();

    // Check if it's a working day
    const isWorkingDay = branchConfig.workingDays?.includes(dayOfWeek);

    if (isWorkingDay) {
      sessions.push({
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
        vehicleId: plan.vehicleId,
        sessionDate: dateToString(currentDate), // Store as YYYY-MM-DD string
        startTime: plan.joiningTime,
        endTime: calculateEndTime(plan.joiningTime, 30), // Default 30 minutes
        status: 'SCHEDULED' as const,
        sessionNumber,
      });

      sessionsScheduled++;
      sessionNumber++;
    }

    // Move to next day (timezone-safe)
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() + 1
    );

    // Safety check to prevent infinite loop (365 days from joining date)
    const safetyLimit = new Date(
      joiningDate.getFullYear() + 1,
      joiningDate.getMonth(),
      joiningDate.getDate()
    );
    if (currentDate > safetyLimit) {
      break;
    }
  }

  return sessions;
};

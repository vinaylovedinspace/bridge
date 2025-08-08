import { format } from 'date-fns';

// Time slot configuration constants
const TIME_SLOT_INTERVAL_MINUTES = 30;
const MINUTES_PER_HOUR = 60;
const ZERO_SECONDS = 0;
const ZERO_MILLISECONDS = 0;
const RESET_MINUTES = 0;

// Session assignment constants
export const DEFAULT_SESSION_DURATION_MINUTES = 30;
export const WEEK_START_DAY = 0; // Sunday = 0
export const DAYS_IN_WEEK = 7;

// Utility functions for time calculations
export const calculateEndTime = (
  startHour: number,
  startMinute: number,
  durationMinutes: number = DEFAULT_SESSION_DURATION_MINUTES
) => {
  const totalStartMinutes = startHour * MINUTES_PER_HOUR + startMinute;
  const totalEndMinutes = totalStartMinutes + durationMinutes;

  const endHour = Math.floor(totalEndMinutes / MINUTES_PER_HOUR);
  const endMinute = totalEndMinutes % MINUTES_PER_HOUR;

  return {
    hour: endHour,
    minute: endMinute,
    formatted: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`,
  };
};

export const formatTimeSlot = (hour: number, minute: number) => {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

// Generate time slots based on operating hours
export const generateTimeSlots = (
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number
) => {
  const slots = [];
  let currentHour = startHour;
  let currentMinute = startMinute;

  // Calculate total end time in minutes for comparison
  const endTotalMinutes = endHour * MINUTES_PER_HOUR + endMinute;

  while (currentHour * MINUTES_PER_HOUR + currentMinute < endTotalMinutes) {
    const time = new Date();
    time.setHours(currentHour, currentMinute, ZERO_SECONDS, ZERO_MILLISECONDS);

    slots.push({
      time: format(time, 'h:mm a'),
      hour: currentHour,
      minute: currentMinute,
    });

    // Add interval minutes
    currentMinute += TIME_SLOT_INTERVAL_MINUTES;
    if (currentMinute >= MINUTES_PER_HOUR) {
      currentHour++;
      currentMinute = RESET_MINUTES;
    }
  }

  return slots;
};

// Generate avatar colors for clients
export const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-red-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-pink-500',
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// Get session status color and icon
export const getStatusStyles = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return {
        color: 'bg-green-500',
        borderColor: 'border-green-500',
        textColor: 'text-green-700',
        label: 'Completed',
        dotColor: 'bg-green-500',
      };
    case 'IN_PROGRESS':
      return {
        color: 'bg-orange-500',
        borderColor: 'border-orange-500',
        textColor: 'text-orange-700',
        label: 'In Progress',
        dotColor: 'bg-orange-500',
      };
    case 'NO_SHOW':
      return {
        color: 'bg-red-500',
        borderColor: 'border-red-500',
        textColor: 'text-red-700',
        label: 'No Show',
        dotColor: 'bg-red-500',
      };
    case 'CANCELLED':
      return {
        color: 'bg-gray-400',
        borderColor: 'border-gray-400',
        textColor: 'text-gray-700',
        label: 'Cancelled',
        dotColor: 'bg-gray-400',
      };
    case 'RESCHEDULED':
      return {
        color: 'bg-blue-400',
        borderColor: 'border-blue-400',
        textColor: 'text-blue-700',
        label: 'Rescheduled',
        dotColor: 'bg-blue-400',
      };
    default: // SCHEDULED
      return {
        color: 'bg-blue-500',
        borderColor: 'border-blue-500',
        textColor: 'text-blue-700',
        label: 'Scheduled',
        dotColor: 'bg-blue-500',
      };
  }
};

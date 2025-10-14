/**
 * Comprehensive date and time utilities for India-only application
 * All dates and times are in IST (India Standard Time) - no timezone conversions
 * Handles dates as YYYY-MM-DD strings and times as HH:MM strings
 */

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Format time from Date object to HH:MM string
 * Preserves the local timezone (doesn't convert to UTC)
 */
export const formatTimeString = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Format date to YYYY-MM-DD string (preserves local IST date, no timezone conversion)
 */
export const formatDateToYYYYMMDD = (date: Date | null): string => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format date for display (e.g., "July 19, 2025")
 */
export function formatDateForDisplay(input: Date | string | null | undefined): string {
  const date = parseDate(input);
  if (!date) return '';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ============================================================================
// Date Parsing
// ============================================================================

/**
 * Convert YYYY-MM-DD string to JavaScript Date (local date, no timezone conversion)
 */
export function stringToDate(dateString: string): Date {
  // Parse as local date by adding T00:00:00 (prevents UTC interpretation)
  return new Date(dateString + 'T00:00:00');
}

/**
 * Parses a YYYY-MM-DD string to a Date object
 * @param dateString The string in YYYY-MM-DD format
 * @returns A Date object, or null if the input is null or invalid
 */
export function parseYYYYMMDDToDate(dateString: string | null): Date | null {
  if (!dateString) return null;

  // Check if the string is in the expected format
  const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateString);
  if (!isValidFormat) return null;

  // Create a new date (using the constructor with year, month, day ensures no timezone issues)
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  // Validate that the date is valid
  if (isNaN(date.getTime())) return null;

  return date;
}

/**
 * Parse date from various formats (Date object, YYYY-MM-DD string, or ISO string)
 * Returns Date object in local timezone
 */
export function parseDate(input: Date | string | null | undefined): Date | null {
  if (!input) return null;

  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }

  if (typeof input === 'string') {
    // YYYY-MM-DD format (preferred)
    if (input.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return stringToDate(input);
    }

    // ISO string or other format (legacy)
    const parsed = new Date(input);
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  return null;
}

/**
 * Helper function to convert date string to Date object
 */
export const parseDateStringToDateObject = (dateString: string | null): Date | null => {
  if (!dateString) return null;
  return new Date(dateString);
};

// ============================================================================
// Date Validation
// ============================================================================

/**
 * Check if a date string is valid YYYY-MM-DD format
 */
export function isValidDateString(dateString: string): boolean {
  if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return false;

  const date = stringToDate(dateString);
  return formatDateToYYYYMMDD(date) === dateString; // Round-trip validation
}

/**
 * Checks if a date falls on a non-working day
 * @param date The date to check
 * @param workingDays Array of working days (0=Sunday, 6=Saturday)
 * @returns true if the date is a non-working day, false otherwise
 */
export function isNonWorkingDay(date: Date, workingDays: number[]): boolean {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  return !workingDays.includes(dayOfWeek);
}

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayString(): string {
  return formatDateToYYYYMMDD(new Date());
}

/**
 * Creates a date filter function that combines working days constraints with other filters
 * @param workingDays Array of working days (0=Sunday, 6=Saturday)
 * @param additionalFilter Optional additional filter function
 * @param minDate Optional minimum date
 * @param maxDate Optional maximum date
 * @returns A filter function that returns true for dates that should be disabled
 */
export function createDateFilter(
  workingDays: number[],
  additionalFilter?: (date: Date) => boolean,
  minDate?: Date,
  maxDate?: Date
): (date: Date) => boolean {
  return (date: Date) => {
    // Check min/max date constraints
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;

    // Check if it's a non-working day
    if (isNonWorkingDay(date, workingDays)) return true;

    // Apply additional filter if provided
    return additionalFilter ? additionalFilter(date) : false;
  };
}

// ============================================================================
// Time Utilities
// ============================================================================

/**
 * Normalize time string to HH:MM format (removes seconds if present)
 * @param timeString Time string in HH:MM or HH:MM:SS format
 * @returns Time string in HH:MM format
 */
export function normalizeTimeString(timeString: string): string {
  return timeString.substring(0, 5);
}

/**
 * Parses a time string in HH:MM format to minutes since midnight
 * @param timeString Time string in HH:MM format
 * @returns Minutes since midnight
 */
export function parseTimeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Checks if a time (in hours and minutes) is within operating hours
 * @param hours Hours (0-23)
 * @param minutes Minutes (0-59)
 * @param operatingHours Operating hours object with start and end times in HH:MM format
 * @returns true if the time is within operating hours, false otherwise
 */
export function isTimeWithinOperatingHours(
  hours: number,
  minutes: number,
  operatingHours?: { start: string; end: string }
): boolean {
  if (!operatingHours) return true; // No restrictions if operating hours not provided

  const timeInMinutes = hours * 60 + minutes;
  const startMinutes = parseTimeToMinutes(operatingHours.start);
  const endMinutes = parseTimeToMinutes(operatingHours.end);

  return timeInMinutes >= startMinutes && timeInMinutes <= endMinutes;
}

/**
 * Gets valid hours for selection based on operating hours
 * @param isPM Whether it's PM (true) or AM (false)
 * @param operatingHours Operating hours object with start and end times in HH:MM format
 * @returns Array of valid hours (1-12) that can be selected
 */
export function getValidHours(
  isPM: boolean,
  operatingHours?: { start: string; end: string }
): number[] {
  if (!operatingHours) return Array.from({ length: 12 }, (_, i) => i + 1); // All hours if no restrictions

  const startMinutes = parseTimeToMinutes(operatingHours.start);
  const endMinutes = parseTimeToMinutes(operatingHours.end);

  const startHour24 = Math.floor(startMinutes / 60);
  const endHour24 = Math.floor(endMinutes / 60);

  // Convert to 12-hour format with AM/PM context
  const startIsPM = startHour24 >= 12;
  const endIsPM = endHour24 >= 12;

  const hours: number[] = [];

  // If we're in AM but operating hours start in PM, no AM hours are valid
  if (!isPM && startIsPM) return [];

  // If we're in PM but operating hours end in AM, no PM hours are valid
  if (isPM && !endIsPM) return [];

  // If we're in the same period as start/end (both AM or both PM)
  if ((!isPM && !startIsPM) || (isPM && startIsPM)) {
    // Get valid hours in the current period
    for (let h = 1; h <= 12; h++) {
      const hour24 = isPM ? (h === 12 ? 12 : h + 12) : h === 12 ? 0 : h;

      if (
        (!isPM && !startIsPM && hour24 >= startHour24) ||
        (isPM && startIsPM && hour24 >= startHour24)
      ) {
        if (
          (!isPM && !endIsPM && hour24 <= endHour24) ||
          (isPM && endIsPM && hour24 <= endHour24) ||
          (isPM && !endIsPM)
        ) {
          hours.push(h);
        }
      }
    }
  } else if (!isPM && endIsPM) {
    // If we're in AM and end is in PM, all AM hours after start are valid
    for (let h = 1; h <= 12; h++) {
      const hour24 = h === 12 ? 0 : h;
      if (hour24 >= startHour24) {
        hours.push(h);
      }
    }
  } else if (isPM && !startIsPM) {
    // If we're in PM and start is in AM, all PM hours before end are valid
    for (let h = 1; h <= 12; h++) {
      const hour24 = h === 12 ? 12 : h + 12;
      if (hour24 <= endHour24) {
        hours.push(h);
      }
    }
  }

  return hours;
}

/**
 * Gets valid minutes for selection based on operating hours and selected hour
 * @param hour Selected hour in 12-hour format (1-12)
 * @param isPM Whether it's PM (true) or AM (false)
 * @param operatingHours Operating hours object with start and end times in HH:MM format
 * @param minuteStep Step size for minutes (default: 5)
 * @returns Array of valid minutes (0-55, step 5) that can be selected
 */
export function getValidMinutes(
  hour: number,
  isPM: boolean,
  operatingHours?: { start: string; end: string },
  minuteStep: number = 5
): number[] {
  if (!operatingHours) return Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);

  const startMinutes = parseTimeToMinutes(operatingHours.start);
  const endMinutes = parseTimeToMinutes(operatingHours.end);

  // Convert selected hour to 24-hour format
  const hour24 = isPM ? (hour === 12 ? 12 : hour + 12) : hour === 12 ? 0 : hour;

  const startHour24 = Math.floor(startMinutes / 60);
  const endHour24 = Math.floor(endMinutes / 60);

  const startMinute = startMinutes % 60;
  const endMinute = endMinutes % 60;

  // Generate all possible minutes with the specified step
  const allMinutes = Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);

  // If hour is outside operating hours, return empty array
  if (hour24 < startHour24 || hour24 > endHour24) return [];

  // If hour is at the boundaries, filter minutes
  if (hour24 === startHour24) {
    // At start hour, only include minutes >= startMinute
    return allMinutes.filter((m) => m >= startMinute);
  } else if (hour24 === endHour24) {
    // At end hour, only include minutes <= endMinute
    return allMinutes.filter((m) => m <= endMinute);
  }

  // Hour is within range but not at boundaries, all minutes are valid
  return allMinutes;
}

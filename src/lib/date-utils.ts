/**
 * Date utilities for India-only application
 * Handles dates as YYYY-MM-DD strings to avoid timezone conversion issues
 */

/**
 * Convert JavaScript Date to YYYY-MM-DD string (local date, no timezone conversion)
 */
export function dateToString(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided to dateToString');
  }

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert YYYY-MM-DD string to JavaScript Date (local date, no timezone conversion)
 */
export function stringToDate(dateString: string): Date {
  // Parse as local date by adding T00:00:00 (prevents UTC interpretation)
  return new Date(dateString + 'T00:00:00');
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayString(): string {
  return dateToString(new Date());
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

/**
 * Check if a date string is valid YYYY-MM-DD format
 */
export function isValidDateString(dateString: string): boolean {
  if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return false;

  const date = stringToDate(dateString);
  return dateToString(date) === dateString; // Round-trip validation
}

// Helper function to convert date string to Date object
export const parseDateStringToDateObject = (dateString: string | null): Date | null => {
  if (!dateString) return null;
  return new Date(dateString);
};

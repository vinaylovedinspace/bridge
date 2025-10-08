export const DEFAULT_WORKING_DAYS = [0, 1, 2, 3, 4, 5, 6];

export const DEFAULT_OPERATING_HOURS = {
  start: '06:00',
  end: '20:00',
} as const;

export const DEFAULT_STATE = 'Maharashtra';

export const DAYS_OF_WEEK = [
  { id: 0, label: 'Sunday', short: 'Sun' },
  { id: 1, label: 'Monday', short: 'Mon' },
  { id: 2, label: 'Tuesday', short: 'Tue' },
  { id: 3, label: 'Wednesday', short: 'Wed' },
  { id: 4, label: 'Thursday', short: 'Thu' },
  { id: 5, label: 'Friday', short: 'Fri' },
  { id: 6, label: 'Saturday', short: 'Sat' },
] as const;

export const DEFAULT_SESSION_DAYS = 21;
export const DEFAULT_SESSION_MINUTES = 30;

export const LAST_ENROLLMENT_CLIENT_ID = 'last-enrollment-clientId';
export const LAST_ENROLLMENT_STEP = 'last-enrollment-step';

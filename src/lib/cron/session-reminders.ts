import { format, parse } from 'date-fns';

/**
 * Shared utilities for session reminder cron jobs
 */

// Helper function to format date for display in WhatsApp messages
export function formatDate(dateString: string): string {
  if (!dateString || typeof dateString !== 'string') {
    throw new Error('Invalid date string provided');
  }

  // Parse as local date to avoid timezone issues
  const date = new Date(dateString + 'T00:00:00');

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }

  return format(date, 'EEEE, MMMM d');
}

// Helper function to format time for display in WhatsApp messages
export function formatTime(timeString: string): string {
  if (!timeString || typeof timeString !== 'string') {
    throw new Error('Invalid time string provided');
  }

  const timeDate = parse(timeString, 'HH:mm', new Date());

  if (isNaN(timeDate.getTime())) {
    throw new Error(`Invalid time: ${timeString}`);
  }

  return format(timeDate, 'h:mm a');
}

// Placeholder function for WhatsApp messaging - to be implemented later
 
export async function sendWhatsAppMessage(): Promise<void> {
  // phoneNumber: string,
  // message: string,
  // fromNumber?: string | null
  // TODO: Implement actual WhatsApp API integration
  // This is where you would integrate with WhatsApp Business API or third-party service

  // Silently succeed for now - remove console logs for production
  return Promise.resolve();
}

// Generate WhatsApp message for session reminder
export function generateSessionReminderMessage(
  clientFirstName: string,
  clientLastName: string,
  sessionNumber: number,
  sessionDate: string,
  startTime: string,
  branchName: string,
  isForTomorrow: boolean
): string {
  const dayText = isForTomorrow ? 'tomorrow' : 'today';
  const formattedDate = formatDate(sessionDate);
  const formattedTime = formatTime(startTime);

  return `Hi ${clientFirstName} ${clientLastName}! 👋 

This is a reminder that you have your driving lesson #${sessionNumber} scheduled for ${dayText} (${formattedDate}) at ${formattedTime}.

Please be on time and bring your learning license. If you need to reschedule, please contact us as soon as possible.

Good luck with your lesson! 🚗

- ${branchName}`;
}

// Process reminder results and return summary
export function processReminderResults(reminderResults: PromiseSettledResult<void>[]): {
  successful: number;
  failed: number;
} {
  const successful = reminderResults.filter((result) => result.status === 'fulfilled').length;
  const failed = reminderResults.filter((result) => result.status === 'rejected').length;

  return { successful, failed };
}

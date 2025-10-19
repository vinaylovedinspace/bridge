import { buildSessionReminderMessage } from '../core/message-builder';
import {
  sendMessageWithRetry,
  buildMessageData,
  BaseClientData,
  validateAndSetup,
} from '../core/service-base';

export type SessionReminderClientData = BaseClientData;

export interface SessionReminderServiceData {
  sessionId: string;
  sessionDate: string;
  startTime: string;
  sessionNumber?: number;
  instructorName?: string;
  vehicleDetails?: {
    name: string;
    number: string;
  };
}

export async function sendSessionReminder(
  client: SessionReminderClientData,
  session: SessionReminderServiceData
): Promise<{ success: boolean; error?: string }> {
  console.log('📱 [Session] Sending reminder for session:', session.sessionId);

  const setup = await validateAndSetup(client, 'session_reminder');
  if (!setup.success) return setup;

  const messageData = buildMessageData(client, setup.tenantName, {
    sessionDate: session.sessionDate,
    startTime: session.startTime,
    sessionNumber: session.sessionNumber,
    instructorName: session.instructorName,
    vehicleDetails: session.vehicleDetails,
  });

  const message = buildSessionReminderMessage(messageData);

  return await sendMessageWithRetry(client, message, 'session_reminder', {
    sessionId: session.sessionId,
  });
}

/**
 * Modern WhatsApp Onboarding Service
 * Functional approach for onboarding messages
 */

import { buildOnboardingMessage } from '../core/message-builder';
import {
  validateAndSetup,
  sendMessageWithRetry,
  buildMessageData,
  BaseClientData,
} from '../core/service-base';
import { hasMessageBeenSent } from '../utils/logger';

export interface OnboardingClientData extends BaseClientData {
  plan?: {
    numberOfSessions: number;
    joiningDate: string;
    joiningTime: string;
  };
  sessions?: Array<{
    sessionDate: string;
    startTime: string;
  }>;
  vehicleDetails: {
    name: string;
    number: string;
    type?: string;
  };
}

export async function sendOnboardingMessage(client: OnboardingClientData): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log('📱 [Onboarding] Starting message for:', client.firstName, client.lastName);

  // Check if onboarding message already sent
  const alreadySent = await hasMessageBeenSent(client.id, 'onboarding');
  if (alreadySent) {
    console.log('⚠️ [Onboarding] Message already sent to this client');
    return { success: false, error: 'Onboarding message already sent' };
  }

  const setup = await validateAndSetup(client, 'onboarding');
  if (!setup.success) return setup;

  // Generate schedule from plan or use provided sessions
  const schedule = generateSchedule(client);
  const totalSessions = client.sessions?.length || client.plan?.numberOfSessions || 0;

  // Build message
  const messageData = buildMessageData(client, setup.tenantName, {
    schedule,
    totalSessions,
    vehicleDetails: client.vehicleDetails,
  });

  const message = buildOnboardingMessage(messageData);
  return await sendMessageWithRetry(client, message, 'onboarding');
}

function generateSchedule(client: OnboardingClientData): Array<{ date: Date; time: string }> {
  if (client.sessions && client.sessions.length > 0) {
    return client.sessions.map((session) => ({
      date: new Date(session.sessionDate),
      time: session.startTime.substring(0, 5), // Remove seconds
    }));
  }

  if (client.plan) {
    const schedule: Array<{ date: Date; time: string }> = [];
    const joiningDate = new Date(client.plan.joiningDate);
    const joiningTime = client.plan.joiningTime.substring(0, 5);

    for (let i = 0; i < client.plan.numberOfSessions; i++) {
      const sessionDate = new Date(joiningDate);
      sessionDate.setDate(joiningDate.getDate() + i * 7); // Weekly sessions

      schedule.push({
        date: sessionDate,
        time: joiningTime,
      });
    }

    return schedule;
  }

  return [];
}

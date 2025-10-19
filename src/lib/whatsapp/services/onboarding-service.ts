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
import { set, addDays, addYears } from 'date-fns';

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
  // First, try to use actual sessions from database
  if (client.sessions && client.sessions.length > 0) {
    return client.sessions.map((session) => ({
      date: new Date(session.sessionDate),
      time: session.startTime.substring(0, 5), // Remove seconds
    }));
  }

  // Fallback: Generate schedule using the same logic as the actual session generation
  if (client.plan) {
    console.log('📅 [Onboarding] Generating fallback schedule using plan data');
    return generateScheduleFromPlan(client.plan);
  }

  console.warn('⚠️ [Onboarding] No sessions or plan data available');
  return [];
}

// Helper function that mimics the actual session generation logic
function generateScheduleFromPlan(plan: {
  numberOfSessions: number;
  joiningDate: string;
  joiningTime: string;
}): Array<{ date: Date; time: string }> {
  try {
    const schedule: Array<{ date: Date; time: string }> = [];

    // Parse joining date (same logic as actual generation)
    const joiningDate = new Date(plan.joiningDate);
    if (isNaN(joiningDate.getTime())) {
      console.error('❌ [Onboarding] Invalid joining date:', plan.joiningDate);
      return generateDailySchedule(plan);
    }

    // For now, use a simple working days assumption (Mon-Fri = 1-5)
    // This matches most common branch configurations
    const defaultWorkingDays = [1, 2, 3, 4, 5]; // Monday to Friday

    // Start from joining date (same as actual generation)
    let currentDate = set(joiningDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
    let sessionsScheduled = 0;
    const maxDate = addYears(currentDate, 1);

    // Generate sessions using working days (same logic as actual generation)
    while (sessionsScheduled < plan.numberOfSessions && currentDate <= maxDate) {
      const dayOfWeek = currentDate.getDay();

      // Check if it's a working day (using default Mon-Fri)
      if (defaultWorkingDays.includes(dayOfWeek)) {
        schedule.push({
          date: new Date(currentDate),
          time: plan.joiningTime.substring(0, 5), // Remove seconds
        });
        sessionsScheduled++;
      }

      // Move to next day
      currentDate = addDays(currentDate, 1);
    }

    console.log(`📅 [Onboarding] Generated ${schedule.length} sessions using working days`);
    return schedule;
  } catch (error) {
    console.error('❌ [Onboarding] Error generating schedule from plan:', error);
    // Fallback to simple daily schedule
    return generateDailySchedule(plan);
  }
}

// Simple fallback for when working days logic fails
function generateDailySchedule(plan: {
  numberOfSessions: number;
  joiningDate: string;
  joiningTime: string;
}): Array<{ date: Date; time: string }> {
  const schedule: Array<{ date: Date; time: string }> = [];
  const joiningDate = new Date(plan.joiningDate);

  for (let i = 0; i < plan.numberOfSessions; i++) {
    const sessionDate = new Date(joiningDate);
    sessionDate.setDate(joiningDate.getDate() + i); // Daily sessions as fallback

    schedule.push({
      date: sessionDate,
      time: plan.joiningTime.substring(0, 5),
    });
  }

  console.log(`📅 [Onboarding] Generated ${schedule.length} sessions using daily fallback`);
  return schedule;
}

/**
 * Shared WhatsApp Service Base
 * Common functionality for all WhatsApp services to eliminate code duplication
 */

import { sendTextMessage } from './client';
import { formatPhoneForWhatsApp, isValidPhone } from '../utils/phone';
import { withExponentialBackoff } from '../utils/retry';
import { logMessageAttempt } from '../utils/logger';
import { getCurrentTenantName } from '@/server/db/tenant';

export type MessageType =
  | 'payment_receipt'
  | 'payment_link'
  | 'payment_success'
  | 'payment_receipt_with_pdf'
  | 'onboarding'
  | 'session_reminder';

export interface BaseClientData {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface ServiceResult {
  success: boolean;
  error?: string;
}

export interface ServiceSetup {
  success: true;
  tenantName: string;
  clientName: string;
  formattedPhone: string;
}

export interface ServiceError {
  success: false;
  error: string;
}

/**
 * Common validation and setup for all WhatsApp services
 */
export const validateAndSetup = async (
  client: BaseClientData,
  messageType: MessageType
): Promise<ServiceSetup | ServiceError> => {
  // Validate phone number
  if (!isValidPhone(client.phoneNumber)) {
    console.error('❌ [WhatsApp] Invalid phone number:', client.phoneNumber);
    await logMessageAttempt({
      clientId: client.id,
      messageType,
      status: 'failure',
      error: 'Invalid phone number',
      retryCount: 0,
    });
    return { success: false, error: 'Invalid phone number' };
  }

  // Get tenant name
  const tenantName = await getCurrentTenantName();
  if (!tenantName) {
    console.error('❌ [WhatsApp] Could not retrieve tenant name');
    return { success: false, error: 'Could not retrieve driving school name' };
  }

  return {
    success: true,
    tenantName,
    clientName: `${client.firstName} ${client.lastName}`,
    formattedPhone: formatPhoneForWhatsApp(client.phoneNumber),
  };
};

/**
 * Common message sending with retry and logging
 */
export const sendMessageWithRetry = async (
  client: BaseClientData,
  message: string,
  messageType: MessageType,
  metadata?: Record<string, unknown>,
  customSender?: (phone: string, message: string) => Promise<{ success: boolean; error?: unknown }>
): Promise<ServiceResult> => {
  const setup = await validateAndSetup(client, messageType);
  if (!setup.success) return setup;

  try {
    const sender = customSender || sendTextMessage;

    const result = await withExponentialBackoff(async () => {
      return await sender(setup.formattedPhone, message);
    });

    // Log the attempt
    await logMessageAttempt({
      clientId: client.id,
      messageType,
      status: result.success ? 'success' : 'failure',
      error: result.success ? null : JSON.stringify(result.error),
      retryCount: 0,
      metadata,
    });

    if (result.success) {
      console.log(`✅ [WhatsApp] ${messageType} sent successfully`);
    } else {
      console.error(`❌ [WhatsApp] Failed to send ${messageType}:`, result.error);
    }

    return {
      success: result.success,
      error: result.success ? undefined : 'Failed to send message',
    };
  } catch (error) {
    console.error(`❌ [WhatsApp] Error sending ${messageType}:`, error);

    await logMessageAttempt({
      clientId: client.id,
      messageType,
      status: 'failure',
      error: JSON.stringify(error),
      retryCount: 3,
      metadata,
    });

    return { success: false, error: `Failed to send ${messageType}` };
  }
};

/**
 * Helper to build message data with tenant info
 */
export const buildMessageData = <T extends Record<string, unknown>>(
  client: BaseClientData,
  tenantName: string,
  additionalData: T
): T & { name: string; tenantName: string } => ({
  ...additionalData,
  name: `${client.firstName} ${client.lastName}`,
  tenantName,
});

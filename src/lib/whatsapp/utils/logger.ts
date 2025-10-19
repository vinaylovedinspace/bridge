/**
 * WhatsApp message logging utilities
 * Reusable logging functions for tracking message attempts
 */

import { db } from '@/db';
import { MessageLogsTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export interface MessageLogData {
  clientId: string;
  messageType:
    | 'onboarding'
    | 'payment_receipt'
    | 'payment_link'
    | 'payment_success'
    | 'session_reminder'
    | 'payment_receipt_with_pdf';
  status: 'success' | 'failure';
  error?: string | null;
  retryCount?: number;
  metadata?: Record<string, unknown>;
}

export async function logMessageAttempt(data: MessageLogData): Promise<void> {
  try {
    const { randomUUID } = await import('crypto');
    await db.insert(MessageLogsTable).values({
      id: randomUUID(),
      clientId: data.clientId,
      messageType: data.messageType,
      status: data.status,
      error: data.error,
      retryCount: data.retryCount || 0,
      // Note: metadata is not stored in the current schema
    });
  } catch (error) {
    console.error('❌ [WhatsApp Logger] Failed to log message attempt:', error);
    // Don't throw - logging failures shouldn't break the main flow
  }
}

export async function hasMessageBeenSent(
  clientId: string,
  messageType: MessageLogData['messageType']
): Promise<boolean> {
  try {
    const existingLog = await db.query.MessageLogsTable.findFirst({
      where: and(
        eq(MessageLogsTable.clientId, clientId),
        eq(MessageLogsTable.messageType, messageType),
        eq(MessageLogsTable.status, 'success')
      ),
    });

    return !!existingLog;
  } catch (error) {
    console.error('❌ [WhatsApp Logger] Failed to check message history:', error);
    return false; // Assume not sent if we can't check
  }
}

import { serve } from '@upstash/workflow/nextjs';
import { db } from '@/db';
import { SessionTable, ClientTable } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { sendSessionReminder } from '@/lib/whatsapp/services/session-reminder-service';
import { qstashClient } from '@/lib/upstash/workflow';

type SessionWorkflowPayload = {
  sessionId: string;
  sessionDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  endTime: string; // HH:MM:SS
};

export const { POST } = serve<SessionWorkflowPayload>(
  async (context) => {
    const { sessionId, sessionDate, startTime, endTime } = context.requestPayload;

    // Calculate timestamps for sleep
    const startDateTime = new Date(`${sessionDate}T${startTime}`);
    const endDateTime = new Date(`${sessionDate}T${endTime}`);
    const reminderTime = new Date(startDateTime.getTime() - 60 * 60 * 1000); // 1 hour before

    // Sleep until 1 hour before session
    await context.sleepUntil('wait-for-reminder', reminderTime.getTime());

    // Send WhatsApp reminder
    await context.run('send-reminder', async () => {
      const session = await db.query.SessionTable.findFirst({
        where: and(eq(SessionTable.id, sessionId), isNull(SessionTable.deletedAt)),
        with: {
          client: {
            columns: {
              phoneNumber: true,
            },
          },
        },
      });

      // Only send reminder if session is still scheduled
      if (session && session.status === 'SCHEDULED' && session.client?.phoneNumber) {
        // Get full client data for the new function signature
        const fullClient = await db.query.ClientTable.findFirst({
          where: eq(ClientTable.id, session.clientId),
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        });

        if (fullClient) {
          const result = await sendSessionReminder(
            {
              id: fullClient.id,
              firstName: fullClient.firstName,
              lastName: fullClient.lastName,
              phoneNumber: fullClient.phoneNumber,
            },
            {
              sessionId: sessionId,
              sessionDate: sessionDate,
              startTime: startTime,
              sessionNumber: session.sessionNumber,
              instructorName: undefined,
              vehicleDetails: undefined,
            }
          );

          if (result.success) {
            console.log(`Reminder sent for session ${sessionId}`);
          } else {
            console.error(`Failed to send reminder for session ${sessionId}:`, result.error);
          }
        }
      } else {
        console.warn(
          `Skipping reminder for session ${sessionId} - session not found or not scheduled`
        );
      }
    });

    // Sleep until session start time
    await context.sleepUntil('wait-for-session-start', startDateTime.getTime());

    // Validate session before starting
    await context.run('start-session', async () => {
      const session = await db.query.SessionTable.findFirst({
        where: and(eq(SessionTable.id, sessionId), isNull(SessionTable.deletedAt)),
      });

      // Validate session exists and is still scheduled
      if (!session) {
        console.warn(`Session ${sessionId} not found or deleted`);
        return;
      }

      if (session.status !== 'SCHEDULED') {
        console.warn(
          `Session ${sessionId} is not in SCHEDULED status (current: ${session.status})`
        );
        return;
      }

      // Update to IN_PROGRESS
      await db
        .update(SessionTable)
        .set({
          status: 'IN_PROGRESS',
          updatedAt: new Date(),
        })
        .where(eq(SessionTable.id, sessionId));

      console.log(`Session ${sessionId} started - status changed to IN_PROGRESS`);
    });

    // Sleep until session end time
    await context.sleepUntil('wait-for-session-end', endDateTime.getTime());

    // Validate session before completing
    await context.run('complete-session', async () => {
      const session = await db.query.SessionTable.findFirst({
        where: and(eq(SessionTable.id, sessionId), isNull(SessionTable.deletedAt)),
      });

      // Validate session exists and is in progress
      if (!session) {
        console.warn(`Session ${sessionId} not found or deleted`);
        return;
      }

      if (session.status !== 'IN_PROGRESS') {
        console.warn(
          `Session ${sessionId} is not in IN_PROGRESS status (current: ${session.status})`
        );
        return;
      }

      // Update to COMPLETED
      await db
        .update(SessionTable)
        .set({
          status: 'COMPLETED',
          updatedAt: new Date(),
        })
        .where(eq(SessionTable.id, sessionId));

      console.log(`Session ${sessionId} completed - status changed to COMPLETED`);
    });
  },
  {
    qstashClient,
    verbose: true,
  }
);

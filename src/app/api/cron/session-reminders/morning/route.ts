import { NextResponse } from 'next/server';
import { db } from '@/db';
import { env } from '@/env';
import { SessionTable } from '@/db/schema/sessions/columns';
import { eq, and, gte } from 'drizzle-orm';
import { dateToString } from '@/lib/date-utils';
import {
  sendWhatsAppMessage,
  generateSessionReminderMessage,
  processReminderResults,
} from '@/lib/cron/session-reminders';

// Morning cron job - runs at 10AM to remind about same day sessions from 12PM onwards
export async function POST(request: Request) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todayDateString = dateToString(new Date());

    // Get all scheduled sessions for today from 12:00 PM onwards
    const sessions = await db.query.SessionTable.findMany({
      where: and(
        eq(SessionTable.sessionDate, todayDateString),
        eq(SessionTable.status, 'SCHEDULED'),
        gte(SessionTable.startTime, '12:00:00')
      ),
      with: {
        client: true,
        branch: {
          with: {
            tenant: true,
          },
        },
      },
    });

    // Send WhatsApp reminders for each session
    const reminderResults = await Promise.allSettled(
      sessions.map(async (session) => {
        generateSessionReminderMessage(
          session.client.firstName,
          session.client.lastName,
          session.sessionNumber,
          session.sessionDate,
          session.startTime,
          session.branch.name,
          false // isForTomorrow
        );

        return await sendWhatsAppMessage();
      })
    );

    const { successful, failed } = processReminderResults(reminderResults);

    // Only log errors for failed reminders
    if (failed > 0) {
      const failedResults = reminderResults.filter((result) => result.status === 'rejected');
      failedResults.forEach((result) => {
        if (result.status === 'rejected') {
          console.error('Morning reminder failed:', result.reason);
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Morning reminder completed: ${successful} sent, ${failed} failed`,
      sessionsFound: sessions.length,
      remindersSent: successful,
      remindersFailed: failed,
    });
  } catch (error) {
    console.error('Morning reminder cron job failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Morning reminder cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { sendOnboardingWhatsApp } from '@/lib/whatsapp';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { PlanTable } from '@/db/schema/plan/columns';
import { getSessionsByClientId } from '@/server/actions/sessions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Clerk sends various event types; check for user creation
    if (body.type !== 'user.created') {
      return NextResponse.json({ ok: true, ignored: true });
    }

    // Extract user info from Clerk event
    const user = body.data;

    // Find the client by email or phone number
    const client = await db.query.ClientTable.findFirst({
      where: (clients, { or, eq }) =>
        or(
          eq(clients.email, user.email_addresses?.[0]?.email_address || ''),
          eq(clients.phoneNumber, user.phone_numbers?.[0]?.phone_number?.replace(/^\+/, '') || '')
        ),
    });

    if (!client) {
      return NextResponse.json({ ok: false, error: 'Client not found' });
    }

    // Get client's plan and sessions
    const plan = await db.query.PlanTable.findFirst({
      where: eq(PlanTable.clientId, client.id),
    });

    const sessions = await getSessionsByClientId(client.id);

    // Send onboarding WhatsApp message
    const result = await sendOnboardingWhatsApp({
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      phoneNumber: client.phoneNumber,
      plan: plan
        ? {
            numberOfSessions: plan.numberOfSessions,
            joiningDate: plan.joiningDate,
            joiningTime: plan.joiningTime,
          }
        : undefined,
      sessions: sessions.map((session) => ({
        sessionDate: session.sessionDate,
        startTime: session.startTime,
      })),
    });

    return NextResponse.json({
      ok: true,
      result,
      message: result.success
        ? 'WhatsApp message sent successfully'
        : 'Failed to send WhatsApp message',
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}

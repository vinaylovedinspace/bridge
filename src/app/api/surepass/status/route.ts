import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { DigilockerVerificationTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '@/env';
import type { DigilockerStatusResponse } from '@/types/surepass';

export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get client_id from query params
    const searchParams = request.nextUrl.searchParams;
    const client_id = searchParams.get('client_id');

    if (!client_id) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
    }

    // Call Surepass Digilocker Status API
    const response = await fetch(`${env.SUREPASS_BASE_URL}/api/v1/digilocker/status/${client_id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${env.SUREPASS_API_TOKEN}`,
      },
    });

    const data = (await response.json()) as DigilockerStatusResponse;

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.message || data.error || 'Failed to check Digilocker status',
          success: false,
        },
        { status: response.status }
      );
    }

    if (!data.success || !data.data) {
      return NextResponse.json(
        {
          error: data.message || 'Failed to get status from Surepass',
          success: false,
        },
        { status: 400 }
      );
    }

    // Update verification status in database based on response
    const statusMap: Record<string, 'PENDING' | 'AUTHORIZED' | 'COMPLETED' | 'FAILED'> = {
      pending: 'PENDING',
      completed: 'COMPLETED',
      failed: 'FAILED',
    };

    const dbStatus = statusMap[data.data.status] || 'PENDING';

    await db
      .update(DigilockerVerificationTable)
      .set({
        status: dbStatus,
        errorMessage: data.data.error_description || null,
        updatedAt: new Date(),
      })
      .where(eq(DigilockerVerificationTable.clientId, client_id));

    return NextResponse.json({
      success: true,
      status: data.data.status,
      completed: data.data.completed,
      failed: data.data.failed,
      aadhaar_linked: data.data.aadhaar_linked,
      message: data.message || 'Status retrieved successfully',
    });
  } catch (error) {
    console.error('Error checking Digilocker status:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

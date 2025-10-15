import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { DigilockerVerificationTable } from '@/db/schema';
import { env } from '@/env';
import type { DigilockerInitializeRequest, DigilockerInitializeResponse } from '@/types/surepass';

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: DigilockerInitializeRequest = await request.json();
    const { mobile, tenantId, branchId, sendSMS } = body;

    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return NextResponse.json(
        { error: 'Valid 10-digit mobile number is required' },
        { status: 400 }
      );
    }

    if (!tenantId || !branchId) {
      return NextResponse.json({ error: 'Tenant ID and Branch ID are required' }, { status: 400 });
    }

    // Call Surepass Digilocker Initialize API
    const response = await fetch(`${env.SUREPASS_BASE_URL}/api/v1/digilocker/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.SUREPASS_API_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          signup_flow: false,
          mobile,
          send_sms: sendSMS ?? false,
          aadhaar_xml: true,
          skip_main_screen: true,
          prefill_options: {
            mobile_number: mobile,
          },
        },
      }),
    });

    const data = (await response.json()) as DigilockerInitializeResponse;

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.message || data.error || 'Failed to initialize Digilocker',
          success: false,
        },
        { status: response.status }
      );
    }

    if (!data.success || !data.data?.client_id) {
      return NextResponse.json(
        {
          error: data.message || 'Failed to get client ID from Surepass',
          success: false,
        },
        { status: 400 }
      );
    }

    // Create a verification record in database
    await db.insert(DigilockerVerificationTable).values({
      clientId: data.data.client_id,
      phoneNumber: mobile,
      status: 'PENDING',
      tenantId,
      branchId,
    });

    return NextResponse.json({
      success: true,
      client_id: data.data.client_id,
      token: data.data.token,
      url: data.data.url,
      expiry_seconds: data.data.expiry_seconds,
      message: data.message || 'SMS sent successfully. Please check your mobile.',
    });
  } catch (error) {
    console.error('Error initializing Digilocker:', error);
    return NextResponse.json({ error: 'Internal server error', success: false }, { status: 500 });
  }
}

'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { DigilockerVerificationTable } from '@/db/schema';
import { env } from '@/env';
import { eq } from 'drizzle-orm';
import type {
  DigilockerInitializeResponse,
  DigilockerStatusResponse,
  DigilockerDownloadAadhaarResponse,
  ParsedAadhaarData,
} from '@/types/surepass';
import { parseAadhaarDataToFormFields } from '@/lib/surepass/parse-aadhaar-data';

type InitializeDigilockerParams = {
  mobile: string;
  tenantId: string;
  branchId: string;
  sendSMS?: boolean;
};

export async function initializeDigilocker(params: InitializeDigilockerParams) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return { success: false, error: 'Unauthorized' };
    }

    const { mobile, tenantId, branchId, sendSMS } = params;

    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return { success: false, error: 'Valid 10-digit mobile number is required' };
    }

    if (!tenantId || !branchId) {
      return { success: false, error: 'Tenant ID and Branch ID are required' };
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

    if (!response.ok || !data.success || !data.data?.client_id) {
      return {
        success: false,
        error: data.message || data.error || 'Failed to initialize Digilocker',
      };
    }

    // Create a verification record in database
    await db.insert(DigilockerVerificationTable).values({
      clientId: data.data.client_id,
      phoneNumber: mobile,
      status: 'PENDING',
      tenantId,
      branchId,
    });

    return {
      success: true,
      client_id: data.data.client_id,
      token: data.data.token,
      url: data.data.url,
      expiry_seconds: data.data.expiry_seconds,
      message: data.message || 'SMS sent successfully. Please check your mobile.',
    };
  } catch (error) {
    console.error('Error initializing Digilocker:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export async function checkDigilockerStatus(clientId: string) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!clientId) {
      return { success: false, error: 'Client ID is required' };
    }

    // Call Surepass Status API
    const response = await fetch(
      `${env.SUREPASS_BASE_URL}/api/v1/digilocker/status?client_id=${clientId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${env.SUREPASS_API_TOKEN}`,
        },
      }
    );

    const data = (await response.json()) as DigilockerStatusResponse;

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.message || data.error || 'Failed to check status',
      };
    }

    // Update database status
    if (data.data) {
      const newStatus = data.data.completed ? 'COMPLETED' : data.data.failed ? 'FAILED' : 'PENDING';

      await db
        .update(DigilockerVerificationTable)
        .set({ status: newStatus })
        .where(eq(DigilockerVerificationTable.clientId, clientId));
    }

    return {
      success: true,
      completed: data.data?.completed ?? false,
      failed: data.data?.failed ?? false,
      aadhaar_linked: data.data?.aadhaar_linked ?? false,
      message: data.message,
    };
  } catch (error) {
    console.error('Error checking Digilocker status:', error);
    return { success: false, error: 'Internal server error' };
  }
}

type DownloadAadhaarResult = {
  success: boolean;
  error?: string;
  data?: ParsedAadhaarData;
  aadhaarPdfUrl?: string;
};

export async function downloadAadhaarData(clientId: string): Promise<DownloadAadhaarResult> {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!clientId) {
      return { success: false, error: 'Client ID is required' };
    }

    // Call Surepass Download Aadhaar API
    const response = await fetch(
      `${env.SUREPASS_BASE_URL}/api/v1/digilocker/download-aadhaar?client_id=${clientId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${env.SUREPASS_API_TOKEN}`,
        },
      }
    );

    const data = (await response.json()) as DigilockerDownloadAadhaarResponse;

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.message || data.error || 'Failed to download Aadhaar data',
      };
    }

    if (!data.data?.aadhaar_xml_data) {
      return {
        success: false,
        error: 'No Aadhaar data available',
      };
    }

    // Parse the Aadhaar data
    const parsedData = parseAadhaarDataToFormFields(data.data.aadhaar_xml_data);

    // Update verification status
    await db
      .update(DigilockerVerificationTable)
      .set({
        status: 'COMPLETED',
        aadhaarData: data.data.aadhaar_xml_data,
      })
      .where(eq(DigilockerVerificationTable.clientId, clientId));

    return {
      success: true,
      data: parsedData,
      aadhaarPdfUrl: data.data.xml_url,
    };
  } catch (error) {
    console.error('Error downloading Aadhaar data:', error);
    return { success: false, error: 'Internal server error' };
  }
}

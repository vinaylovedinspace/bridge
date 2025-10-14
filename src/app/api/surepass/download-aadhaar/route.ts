import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';
import { db } from '@/db';
import { DigilockerVerificationTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '@/env';
import type {
  DigilockerDownloadAadhaarResponse,
  DigilockerListDocumentsResponse,
  DigilockerDownloadDocumentResponse,
} from '@/types/surepass';
import { parseAadhaarDataToFormFields } from '@/lib/surepass/parse-aadhaar-data';

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { client_id } = body;

    if (!client_id) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
    }

    // Call Surepass Download Aadhaar API
    const response = await fetch(`${env.SUREPASS_BASE_URL}/api/v1/digilocker/aadhaar/${client_id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${env.SUREPASS_API_TOKEN}`,
      },
    });

    const data = (await response.json()) as DigilockerDownloadAadhaarResponse;

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.message || data.error || 'Failed to download Aadhaar data',
          success: false,
        },
        { status: response.status }
      );
    }

    if (!data.success || !data.data?.aadhaar_xml_data) {
      // Update verification status to FAILED
      await db
        .update(DigilockerVerificationTable)
        .set({
          status: 'FAILED',
          errorMessage:
            data.message ||
            'Aadhaar data not available. Please ensure you have authorized Digilocker access.',
          updatedAt: new Date(),
        })
        .where(eq(DigilockerVerificationTable.clientId, client_id));

      return NextResponse.json(
        {
          error:
            data.message ||
            'Aadhaar data not available. Please ensure you have authorized Digilocker access.',
          success: false,
        },
        { status: 400 }
      );
    }

    // Parse Aadhaar XML data to form fields
    const parsedData = parseAadhaarDataToFormFields(data.data.aadhaar_xml_data);

    // Download actual Aadhaar PDF document
    let aadhaarPdfUrl: string | undefined;

    try {
      // First, list all documents to find the Aadhaar document
      const listResponse = await fetch(
        `${env.SUREPASS_BASE_URL}/api/v1/digilocker/list-documents/${client_id}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${env.SUREPASS_API_TOKEN}`,
          },
        }
      );

      const listData = (await listResponse.json()) as DigilockerListDocumentsResponse;

      if (listData.success && listData.data?.documents) {
        // Find Aadhaar document (usually named "Aadhaar" or contains "ADHAR" or "AADHAAR")
        const aadhaarDoc = listData.data.documents.find(
          (doc) =>
            doc.name.toLowerCase().includes('aadhaar') ||
            doc.name.toLowerCase().includes('adhar') ||
            doc.type.toLowerCase().includes('aadhaar')
        );

        if (aadhaarDoc) {
          // Download the Aadhaar PDF document
          const downloadResponse = await fetch(
            `${env.SUREPASS_BASE_URL}/api/v1/digilocker/download-document/${client_id}/${aadhaarDoc.digi_file_id}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${env.SUREPASS_API_TOKEN}`,
              },
            }
          );

          const downloadData =
            (await downloadResponse.json()) as DigilockerDownloadDocumentResponse;

          if (downloadData.success && downloadData.data?.download_url) {
            // Fetch the actual PDF from the download URL
            const pdfResponse = await fetch(downloadData.data.download_url);
            const pdfBuffer = await pdfResponse.arrayBuffer();

            // Create unique filename for Aadhaar PDF
            const filename = `aadhaar-documents/${userId}-${Date.now()}-aadhaar.pdf`;

            // Upload to Vercel Blob
            const blob = await put(filename, pdfBuffer, {
              access: 'public',
              contentType: 'application/pdf',
            });

            aadhaarPdfUrl = blob.url;
          }
        }
      }
    } catch (uploadError) {
      console.error('Error downloading/uploading Aadhaar PDF:', uploadError);
      // Continue even if PDF download fails
    }

    // Update verification record with success data
    await db
      .update(DigilockerVerificationTable)
      .set({
        status: 'COMPLETED',
        aadhaarData: data.data.aadhaar_xml_data as unknown as Record<string, unknown>,
        parsedData: parsedData as unknown as Record<string, unknown>,
        aadhaarPdfUrl,
        updatedAt: new Date(),
      })
      .where(eq(DigilockerVerificationTable.clientId, client_id));

    return NextResponse.json({
      success: true,
      data: parsedData,
      aadhaarPdfUrl,
      message: 'Aadhaar data retrieved successfully',
    });
  } catch (error) {
    console.error('Error downloading Aadhaar data:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

import { db } from '@/db';
import { DigilockerVerificationTable } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Get the most recent completed Digilocker verification for a phone number
 * Returns the aadhaarPdfUrl if available
 */
export async function getAadhaarPdfUrlByPhoneNumber(phoneNumber: string, tenantId: string) {
  const [verification] = await db
    .select({
      aadhaarPdfUrl: DigilockerVerificationTable.aadhaarPdfUrl,
    })
    .from(DigilockerVerificationTable)
    .where(
      and(
        eq(DigilockerVerificationTable.phoneNumber, phoneNumber),
        eq(DigilockerVerificationTable.tenantId, tenantId),
        eq(DigilockerVerificationTable.status, 'COMPLETED')
      )
    )
    .orderBy(desc(DigilockerVerificationTable.createdAt))
    .limit(1);

  return verification?.aadhaarPdfUrl || null;
}

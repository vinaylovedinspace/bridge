import { db } from '@/db';
import { ClientTable } from '@/db/schema/client/columns';
import { LearningLicenseTable } from '@/db/schema/learning-licenses/columns';
import { RTOServicesTable } from '@/db/schema/rto-services/columns';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { getBranchConfig } from './branch';

export async function getAppointmentStatistics() {
  const { tenantId } = await getBranchConfig();

  if (!tenantId) {
    console.error('getAppointmentStatistics: No tenant found - returning empty statistics');
    // Return empty statistics instead of throwing
    return {
      learningTestCount: 0,
      finalTestCount: 0,
      rtoWorkCount: 0,
    };
  }

  // Learning Test Count: Clients with FULL_SERVICE who don't have a learning license number yet
  // This includes clients who either:
  // 1. Don't have a learning license record at all, OR
  // 2. Have a learning license record but licenseNumber is null/empty
  const learningTestCountResult = await db
    .select({ count: count() })
    .from(ClientTable)
    .leftJoin(LearningLicenseTable, eq(ClientTable.id, LearningLicenseTable.clientId))
    .where(
      and(
        eq(ClientTable.tenantId, tenantId),
        eq(ClientTable.serviceType, 'FULL_SERVICE'),
        sql`(${LearningLicenseTable.licenseNumber} IS NULL OR ${LearningLicenseTable.licenseNumber} = '')`
      )
    );

  // Final Test Count: Clients with FULL_SERVICE who got their learning license 30+ days ago
  const finalTestCountResult = await db
    .select({ count: count() })
    .from(ClientTable)
    .innerJoin(LearningLicenseTable, eq(ClientTable.id, LearningLicenseTable.clientId))
    .where(
      and(
        eq(ClientTable.tenantId, tenantId),
        eq(ClientTable.serviceType, 'FULL_SERVICE'),
        sql`${LearningLicenseTable.issueDate} IS NOT NULL`,
        sql`CURRENT_DATE - CAST(${LearningLicenseTable.issueDate} AS DATE) >= 30`
      )
    );

  // RTO Work Count: Count of uncompleted RTO services (not completed, rejected, or cancelled)
  const rtoWorkCountResult = await db
    .select({ count: count() })
    .from(RTOServicesTable)
    .where(
      and(
        eq(RTOServicesTable.tenantId, tenantId),
        inArray(RTOServicesTable.status, [
          'PENDING',
          'DOCUMENT_COLLECTION',
          'APPLICATION_SUBMITTED',
          'UNDER_REVIEW',
          'APPROVED',
        ])
      )
    );

  return {
    learningTestCount: learningTestCountResult[0]?.count || 0,
    finalTestCount: finalTestCountResult[0]?.count || 0,
    rtoWorkCount: rtoWorkCountResult[0]?.count || 0,
  };
}

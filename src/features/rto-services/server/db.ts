import { db } from '@/db';
import { RTOServicesTable, RTOClientTable } from '@/db/schema';
import { eq, and, desc, ilike, or, isNull } from 'drizzle-orm';
import type { RTOServiceWithClient, RTOServiceStatus, RTOServiceType } from '../types';

export const addRTOService = async (data: typeof RTOServicesTable.$inferInsert) => {
  const [rtoService] = await db.insert(RTOServicesTable).values(data).returning();
  return rtoService;
};

export const updateRTOService = async (
  id: string,
  data: Partial<typeof RTOServicesTable.$inferInsert>
) => {
  try {
    const [rtoService] = await db
      .update(RTOServicesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(RTOServicesTable.id, id))
      .returning();

    return rtoService;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const getRTOService = async (id: string): Promise<RTOServiceWithClient | null> => {
  try {
    const [result] = await db
      .select({
        id: RTOServicesTable.id,
        rtoClientId: RTOServicesTable.rtoClientId,
        branchId: RTOServicesTable.branchId,
        tenantId: RTOServicesTable.tenantId,
        serviceType: RTOServicesTable.serviceType,
        status: RTOServicesTable.status,
        priority: RTOServicesTable.priority,
        applicationNumber: RTOServicesTable.applicationNumber,
        rtoOffice: RTOServicesTable.rtoOffice,
        existingLicenseNumber: RTOServicesTable.existingLicenseNumber,
        governmentFees: RTOServicesTable.governmentFees,
        serviceCharge: RTOServicesTable.serviceCharge,
        urgentFees: RTOServicesTable.urgentFees,
        totalAmount: RTOServicesTable.totalAmount,
        applicationDate: RTOServicesTable.applicationDate,
        expectedCompletionDate: RTOServicesTable.expectedCompletionDate,
        actualCompletionDate: RTOServicesTable.actualCompletionDate,
        remarks: RTOServicesTable.remarks,
        requiredDocuments: RTOServicesTable.requiredDocuments,
        submittedDocuments: RTOServicesTable.submittedDocuments,
        trackingNumber: RTOServicesTable.trackingNumber,
        agentAssigned: RTOServicesTable.agentAssigned,
        isDocumentCollectionComplete: RTOServicesTable.isDocumentCollectionComplete,
        isPaymentComplete: RTOServicesTable.isPaymentComplete,
        requiresClientPresence: RTOServicesTable.requiresClientPresence,
        createdAt: RTOServicesTable.createdAt,
        updatedAt: RTOServicesTable.updatedAt,
        deletedAt: RTOServicesTable.deletedAt,
        rtoClient: {
          id: RTOClientTable.id,
          clientCode: RTOClientTable.clientCode,
          firstName: RTOClientTable.firstName,
          middleName: RTOClientTable.middleName,
          lastName: RTOClientTable.lastName,
          phoneNumber: RTOClientTable.phoneNumber,
          aadhaarNumber: RTOClientTable.aadhaarNumber,
        },
      })
      .from(RTOServicesTable)
      .leftJoin(RTOClientTable, eq(RTOServicesTable.rtoClientId, RTOClientTable.id))
      .where(and(eq(RTOServicesTable.id, id), isNull(RTOServicesTable.deletedAt)));

    return result || null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const getRTOServices = async (
  branchId: string,
  filters?: {
    status?: RTOServiceStatus;
    serviceType?: RTOServiceType;
    client?: string;
  }
): Promise<RTOServiceWithClient[]> => {
  try {
    const query = db
      .select({
        id: RTOServicesTable.id,
        rtoClientId: RTOServicesTable.rtoClientId,
        branchId: RTOServicesTable.branchId,
        tenantId: RTOServicesTable.tenantId,
        serviceType: RTOServicesTable.serviceType,
        status: RTOServicesTable.status,
        priority: RTOServicesTable.priority,
        applicationNumber: RTOServicesTable.applicationNumber,
        rtoOffice: RTOServicesTable.rtoOffice,
        existingLicenseNumber: RTOServicesTable.existingLicenseNumber,
        governmentFees: RTOServicesTable.governmentFees,
        serviceCharge: RTOServicesTable.serviceCharge,
        urgentFees: RTOServicesTable.urgentFees,
        totalAmount: RTOServicesTable.totalAmount,
        applicationDate: RTOServicesTable.applicationDate,
        expectedCompletionDate: RTOServicesTable.expectedCompletionDate,
        actualCompletionDate: RTOServicesTable.actualCompletionDate,
        remarks: RTOServicesTable.remarks,
        requiredDocuments: RTOServicesTable.requiredDocuments,
        submittedDocuments: RTOServicesTable.submittedDocuments,
        trackingNumber: RTOServicesTable.trackingNumber,
        agentAssigned: RTOServicesTable.agentAssigned,
        isDocumentCollectionComplete: RTOServicesTable.isDocumentCollectionComplete,
        isPaymentComplete: RTOServicesTable.isPaymentComplete,
        requiresClientPresence: RTOServicesTable.requiresClientPresence,
        createdAt: RTOServicesTable.createdAt,
        updatedAt: RTOServicesTable.updatedAt,
        deletedAt: RTOServicesTable.deletedAt,
        rtoClient: {
          id: RTOClientTable.id,
          clientCode: RTOClientTable.clientCode,
          firstName: RTOClientTable.firstName,
          middleName: RTOClientTable.middleName,
          lastName: RTOClientTable.lastName,
          phoneNumber: RTOClientTable.phoneNumber,
          aadhaarNumber: RTOClientTable.aadhaarNumber,
        },
      })
      .from(RTOServicesTable)
      .leftJoin(RTOClientTable, eq(RTOServicesTable.rtoClientId, RTOClientTable.id));

    const conditions = [
      eq(RTOServicesTable.branchId, branchId),
      isNull(RTOServicesTable.deletedAt),
    ];

    if (filters?.status) {
      conditions.push(eq(RTOServicesTable.status, filters.status));
    }

    if (filters?.serviceType) {
      conditions.push(eq(RTOServicesTable.serviceType, filters.serviceType));
    }

    if (filters?.client) {
      conditions.push(
        or(
          ilike(RTOClientTable.firstName, `%${filters.client}%`),
          ilike(RTOClientTable.lastName, `%${filters.client}%`),
          ilike(RTOClientTable.aadhaarNumber, `%${filters.client}%`),
          ilike(RTOClientTable.phoneNumber, `%${filters.client}%`)
        )!
      );
    }

    const result = await query.where(and(...conditions)).orderBy(desc(RTOServicesTable.createdAt));

    return result;
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const deleteRTOService = async (id: string, branchId: string) => {
  try {
    const [rtoService] = await db
      .update(RTOServicesTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(RTOServicesTable.id, id),
          eq(RTOServicesTable.branchId, branchId),
          isNull(RTOServicesTable.deletedAt)
        )
      )
      .returning();

    return rtoService;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

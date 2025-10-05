import { db } from '@/db';
import { ClientTable, RTOServicesTable } from '@/db/schema';
import { eq, and, ilike, or, isNull } from 'drizzle-orm';
import type { RTOServiceStatus, RTOServiceType } from '../types';

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

export const getRTOService = async (id: string) => {
  try {
    const conditions = [eq(RTOServicesTable.id, id), isNull(RTOServicesTable.deletedAt)];

    const rtoService = await db.query.RTOServicesTable.findFirst({
      where: and(...conditions),
      with: {
        client: true,
      },
      orderBy: (RTOServicesTable, { desc }) => [desc(RTOServicesTable.createdAt)],
    });

    return rtoService;
  } catch (error) {
    console.log(error);
    return undefined;
  }
};

export const getRTOServices = async (
  branchId: string,
  filters?: {
    status?: RTOServiceStatus;
    serviceType?: RTOServiceType;
    client?: string;
  }
) => {
  try {
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
          ilike(ClientTable.firstName, `%${filters.client}%`),
          ilike(ClientTable.lastName, `%${filters.client}%`),
          ilike(ClientTable.aadhaarNumber, `%${filters.client}%`),
          ilike(ClientTable.phoneNumber, `%${filters.client}%`)
        )!
      );
    }

    const rtoServices = await db.query.RTOServicesTable.findMany({
      where: and(...conditions),
      with: {
        client: true,
      },
      orderBy: (RTOServicesTable, { desc }) => [desc(RTOServicesTable.createdAt)],
    });

    return rtoServices;
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

export const getRTOServiceByClient = async (clientId: string) => {
  try {
    const conditions = [
      eq(RTOServicesTable.clientId, clientId),
      isNull(RTOServicesTable.deletedAt),
    ];

    const rtoService = await db.query.RTOServicesTable.findFirst({
      where: and(...conditions),
      with: {
        client: true,
      },
      orderBy: (RTOServicesTable, { desc }) => [desc(RTOServicesTable.createdAt)],
    });

    return rtoService;
  } catch (error) {
    console.log(error);
    return undefined;
  }
};

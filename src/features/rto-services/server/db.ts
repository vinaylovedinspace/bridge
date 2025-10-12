import { db } from '@/db';
import { ClientTable, PaymentTable, RTOServicesTable } from '@/db/schema';
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
        client: {
          with: {
            drivingLicense: true,
          },
        },
        payment: {
          with: {
            fullPayment: true,
          },
        },
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
    search?: string;
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

    if (filters?.search) {
      conditions.push(
        or(
          ilike(ClientTable.firstName, `%${filters.search}%`),
          ilike(ClientTable.lastName, `%${filters.search}%`),
          ilike(ClientTable.aadhaarNumber, `%${filters.search}%`),
          ilike(ClientTable.phoneNumber, `%${filters.search}%`)
        )!
      );
    }

    const rtoServices = await db.query.RTOServicesTable.findMany({
      where: and(...conditions),
      with: {
        client: true,
        payment: true,
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
    return await db.transaction(async (tx) => {
      const [rtoService] = await tx
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

      // Soft-delete associated payment if exists
      if (rtoService?.paymentId) {
        await tx
          .update(PaymentTable)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(PaymentTable.id, rtoService.paymentId));
      }

      return rtoService;
    });
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

export const insertClient = async (data: typeof ClientTable.$inferInsert) => {
  const [client] = await db.insert(ClientTable).values(data).returning({
    id: ClientTable.id,
  });
  return client;
};

export const updateClient = async (data: typeof ClientTable.$inferInsert, clientId: string) => {
  const [client] = await db
    .update(ClientTable)
    .set(data)
    .where(eq(ClientTable.id, clientId))
    .returning({
      id: ClientTable.id,
    });
  return client;
};

export const createPaymentEntry = async (
  data: typeof PaymentTable.$inferInsert,
  serviceId: string
) => {
  return await db.transaction(async (tx) => {
    const rtoService = await tx.query.RTOServicesTable.findFirst({
      where: eq(RTOServicesTable.id, serviceId),
      with: { payment: true },
    });

    const existingPaymentId = rtoService?.paymentId;

    if (existingPaymentId) {
      const [updatedPayment] = await tx
        .update(PaymentTable)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(PaymentTable.id, existingPaymentId))
        .returning({ id: PaymentTable.id });

      if (!updatedPayment) {
        throw new Error('Failed to update payment');
      }

      return updatedPayment.id;
    }

    const [newPayment] = await tx
      .insert(PaymentTable)
      .values(data)
      .returning({ id: PaymentTable.id });

    if (!newPayment) {
      throw new Error('Failed to create payment');
    }

    await tx
      .update(RTOServicesTable)
      .set({ paymentId: newPayment.id })
      .where(eq(RTOServicesTable.id, serviceId));

    return newPayment.id;
  });
};

export const upsertPaymentInDB = async (
  data: typeof PaymentTable.$inferInsert,
  serviceId: string
) => {
  return await db.transaction(async (tx) => {
    // Fetch plan with associated payment
    const serviceWithPayment = await tx.query.RTOServicesTable.findFirst({
      where: eq(RTOServicesTable.id, serviceId),
      with: { payment: true },
    });

    const existingPayment = serviceWithPayment?.payment;

    // Update existing payment
    if (existingPayment) {
      const [updated] = await tx
        .update(PaymentTable)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(PaymentTable.id, existingPayment.id))
        .returning();

      return {
        payment: updated,
        isExistingPayment: true,
        paymentId: updated.id,
      };
    }

    // Create new payment and link to rto-service
    const [payment] = await tx.insert(PaymentTable).values(data).returning();

    await tx
      .update(RTOServicesTable)
      .set({ paymentId: payment.id, updatedAt: new Date() })
      .where(eq(RTOServicesTable.id, serviceId));

    return {
      payment,
      isExistingPayment: false,
      paymentId: payment.id,
    };
  });
};

export const saveRTOServiceAndPaymentInDB = async (
  clientData: typeof ClientTable.$inferInsert,
  serviceData: Omit<typeof RTOServicesTable.$inferInsert, 'clientId'>,
  paymentData: Omit<typeof PaymentTable.$inferInsert, 'clientId'> & { clientId?: string }
) => {
  return await db.transaction(async (tx) => {
    // 1. Upsert client
    let client: { id: string };
    if (clientData.id) {
      [client] = await tx
        .update(ClientTable)
        .set(clientData)
        .where(eq(ClientTable.id, clientData.id))
        .returning({ id: ClientTable.id });
    } else {
      [client] = await tx.insert(ClientTable).values(clientData).returning({
        id: ClientTable.id,
      });
    }

    // 2. Upsert RTO service
    let rtoService: typeof RTOServicesTable.$inferSelect;
    let isExistingService = false;

    console.log(serviceData, 'serviceData');
    if (serviceData.id) {
      [rtoService] = await tx
        .update(RTOServicesTable)
        .set({ ...serviceData, updatedAt: new Date() })
        .where(eq(RTOServicesTable.id, serviceData.id))
        .returning();
      isExistingService = true;
    } else {
      [rtoService] = await tx
        .insert(RTOServicesTable)
        .values({ ...serviceData, clientId: client.id })
        .returning();
    }

    // 3. Fetch service with associated payment
    const serviceWithPayment = await tx.query.RTOServicesTable.findFirst({
      where: eq(RTOServicesTable.id, rtoService.id),
      with: { payment: true },
    });

    const existingPayment = serviceWithPayment?.payment;

    // 4. Upsert payment
    let payment: typeof PaymentTable.$inferSelect;
    let isExistingPayment = false;

    if (existingPayment) {
      [payment] = await tx
        .update(PaymentTable)
        .set({ ...paymentData, clientId: client.id, updatedAt: new Date() })
        .where(eq(PaymentTable.id, existingPayment.id))
        .returning();
      isExistingPayment = true;
    } else {
      [payment] = await tx
        .insert(PaymentTable)
        .values({ ...paymentData, clientId: client.id })
        .returning();

      await tx
        .update(RTOServicesTable)
        .set({ paymentId: payment.id, updatedAt: new Date() })
        .where(eq(RTOServicesTable.id, rtoService.id));
    }

    return {
      clientId: client.id,
      serviceId: rtoService.id,
      isExistingService,
      paymentId: payment.id,
      isExistingPayment,
    };
  });
};

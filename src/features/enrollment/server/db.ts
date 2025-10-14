import { db } from '@/db';
import {
  ClientTable,
  PaymentTable,
  PlanTable,
  InstallmentPaymentTable,
  VehicleTable,
} from '@/db/schema';
import { LearningLicenseTable } from '@/db/schema/learning-licenses/columns';
import { DrivingLicenseTable } from '@/db/schema/driving-licenses/columns';
import { eq, and, isNull } from 'drizzle-orm';

export const upsertClientInDB = async (data: typeof ClientTable.$inferInsert) => {
  // If client ID is provided (edit mode), update the existing client by ID
  if (data.id) {
    const [client] = await db
      .update(ClientTable)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(ClientTable.id, data.id))
      .returning();

    return {
      clientId: client.id,
    };
  }

  const [client] = await db
    .insert(ClientTable)
    .values(data)
    .onConflictDoUpdate({
      target: [ClientTable.phoneNumber, ClientTable.tenantId],
      set: {
        ...data,
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    clientId: client.id,
  };
};

export const upsertLearningLicenseInDB = async (data: typeof LearningLicenseTable.$inferInsert) => {
  const [license] = await db
    .insert(LearningLicenseTable)
    .values(data)
    .onConflictDoUpdate({
      target: LearningLicenseTable.clientId,
      set: {
        ...data,
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    license,
  };
};

export const upsertDrivingLicenseInDB = async (data: typeof DrivingLicenseTable.$inferInsert) => {
  const [license] = await db
    .insert(DrivingLicenseTable)
    .values(data)
    .onConflictDoUpdate({
      target: DrivingLicenseTable.clientId,
      set: {
        ...data,
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    license,
  };
};

export const createPlanInDB = async (data: typeof PlanTable.$inferInsert) => {
  const [plan] = await db.insert(PlanTable).values(data).returning();

  return {
    plan,
  };
};

export const updatePlanInDB = async (data: Partial<typeof PlanTable.$inferInsert>) => {
  if (!data.id) {
    throw new Error('Plan ID is required');
  }

  const [plan] = await db
    .update(PlanTable)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(PlanTable.id, data.id))
    .returning();

  return {
    plan,
  };
};

export const upsertPlanAndPaymentInDB = async (
  planData: Omit<typeof PlanTable.$inferInsert, 'paymentId'> & { paymentId?: string },
  paymentData: typeof PaymentTable.$inferInsert
) => {
  return await db.transaction(async (tx) => {
    let plan: typeof PlanTable.$inferSelect | undefined;

    // Upsert plan
    if (planData.id) {
      // Update existing plan
      [plan] = await tx
        .update(PlanTable)
        .set({
          ...planData,
          updatedAt: new Date(),
        })
        .where(eq(PlanTable.id, planData.id))
        .returning();

      if (plan.paymentId) {
        await tx
          .update(PaymentTable)
          .set({
            ...paymentData,
            updatedAt: new Date(),
          })
          .where(eq(PaymentTable.id, plan.paymentId));
      }
    } else {
      // Create new Payment
      const [payment] = await tx.insert(PaymentTable).values(paymentData).returning();
      // Create new plan
      [plan] = await tx
        .insert(PlanTable)
        .values({
          ...planData,
          paymentId: payment.id,
        })
        .returning();
    }

    if (!plan) {
      throw new Error('Failed to create or update plan');
    }

    return {
      plan,
    };
  });
};

export const upsertPlanWithPaymentIdInDB = async (planData: typeof PlanTable.$inferInsert) => {
  if (!planData.paymentId) {
    throw new Error('paymentId is required');
  }

  // If plan ID is provided (edit mode), update the existing plan
  if (planData.id) {
    const [plan] = await db
      .update(PlanTable)
      .set({
        ...planData,
        updatedAt: new Date(),
      })
      .where(eq(PlanTable.id, planData.id))
      .returning();

    return {
      plan,
    };
  }

  // Create new plan
  const [plan] = await db.insert(PlanTable).values(planData).returning();

  return {
    plan,
  };
};

export const updatePlanById = async (
  planId: string,
  data: Partial<typeof PlanTable.$inferInsert>
) => {
  const [plan] = await db
    .update(PlanTable)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(PlanTable.id, planId))
    .returning();

  return {
    plan,
  };
};

export const getClientById = async (clientId: string) => {
  const client = await db.query.ClientTable.findFirst({
    where: eq(ClientTable.id, clientId),
    with: {
      learningLicense: true,
      drivingLicense: true,
      plan: true,
      rtoServices: true,
    },
  });

  return client;
};

export type ClientType = Awaited<ReturnType<typeof getClientById>>;

const calculatePaymentStatus = (paidCount: number): 'PENDING' | 'PARTIALLY_PAID' | 'FULLY_PAID' => {
  if (paidCount === 0) return 'PENDING';
  if (paidCount === 1) return 'PARTIALLY_PAID';
  return 'FULLY_PAID';
};

export const createInstallmentPaymentsInDB = async (
  data: typeof InstallmentPaymentTable.$inferInsert
) => {
  return await db.transaction(async (tx) => {
    // Check if installment already exists
    const existingInstallment = await tx.query.InstallmentPaymentTable.findFirst({
      where: and(
        eq(InstallmentPaymentTable.paymentId, data.paymentId),
        eq(InstallmentPaymentTable.installmentNumber, data.installmentNumber)
      ),
    });

    // Update existing installment
    if (existingInstallment) {
      await tx
        .update(InstallmentPaymentTable)
        .set({
          amount: data.amount,
          paymentMode: data.paymentMode,
          paymentDate: data.paymentDate,
          isPaid: data.isPaid,
        })
        .where(eq(InstallmentPaymentTable.id, existingInstallment.id));

      // Recalculate payment status
      const allInstallments = await tx.query.InstallmentPaymentTable.findMany({
        where: eq(InstallmentPaymentTable.paymentId, data.paymentId),
      });

      const paidCount = allInstallments.filter((inst) => inst.isPaid).length;

      const [updatedPayment] = await tx
        .update(PaymentTable)
        .set({
          paymentStatus: calculatePaymentStatus(paidCount),
          updatedAt: new Date(),
        })
        .where(eq(PaymentTable.id, data.paymentId))
        .returning();

      return updatedPayment;
    }

    // Create new installment and update status
    await tx.insert(InstallmentPaymentTable).values(data);

    const allInstallments = await tx.query.InstallmentPaymentTable.findMany({
      where: eq(InstallmentPaymentTable.paymentId, data.paymentId),
    });

    const paidCount = allInstallments.filter((inst) => inst.isPaid).length;

    const [updatedPayment] = await tx
      .update(PaymentTable)
      .set({
        paymentStatus: calculatePaymentStatus(paidCount),
        updatedAt: new Date(),
      })
      .where(eq(PaymentTable.id, data.paymentId))
      .returning();

    return updatedPayment;
  });
};

// ============================================================================
// Plan-related database queries
// ============================================================================

/**
 * Find existing plan by ID or client ID
 */
export const findExistingPlanInDB = async (
  planId?: string,
  clientId?: string
): Promise<typeof PlanTable.$inferSelect | null> => {
  if (planId) {
    const plan = await db.query.PlanTable.findFirst({
      where: eq(PlanTable.id, planId),
    });
    return plan ?? null;
  }

  if (clientId) {
    const plan = await db.query.PlanTable.findFirst({
      where: eq(PlanTable.clientId, clientId),
    });
    return plan ?? null;
  }

  return null;
};

/**
 * Get client for session generation
 */
export const getClientForSessionsInDB = async (clientId: string) => {
  return await db.query.ClientTable.findFirst({
    where: eq(ClientTable.id, clientId),
    columns: { id: true, firstName: true, lastName: true },
  });
};

// ============================================================================
// Payment-related database queries
// ============================================================================

/**
 * Get plan and vehicle for payment calculation
 */
export const getPlanAndVehicleInDB = async (planId: string) => {
  const plan = await db.query.PlanTable.findFirst({
    where: eq(PlanTable.id, planId),
  });

  if (!plan) {
    return null;
  }

  const vehicle = await db.query.VehicleTable.findFirst({
    where: and(eq(VehicleTable.id, plan.vehicleId), isNull(VehicleTable.deletedAt)),
  });

  if (!vehicle) {
    return null;
  }

  return { plan, vehicle };
};

/**
 * Get existing installments for a payment
 */
export const getExistingInstallmentsInDB = async (paymentId: string) => {
  return await db.query.InstallmentPaymentTable.findMany({
    where: eq(InstallmentPaymentTable.paymentId, paymentId),
    with: {
      payment: true,
    },
  });
};

/**
 * Get plan for fallback session creation
 */
export const getPlanForSessionsInDB = async (planId: string) => {
  return await db.query.PlanTable.findFirst({
    where: eq(PlanTable.id, planId),
  });
};

export const getVehicleRentAmount = async (vehicleId: string) => {
  return await db.query.VehicleTable.findFirst({
    where: and(eq(VehicleTable.id, vehicleId), isNull(VehicleTable.deletedAt)),
    columns: { rent: true },
  });
};

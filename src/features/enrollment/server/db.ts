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

export const updatePaymentInDB = async (data: typeof PaymentTable.$inferInsert) => {
  if (data.id) {
    const [updated] = await db
      .update(PaymentTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(PaymentTable.id, data.id))
      .returning();

    return {
      payment: updated,
      isExistingPayment: true,
      paymentId: updated.id,
    };
  }

  return {
    payment: null,
  };
};

export const upsertPlanAndPaymentInDB = async (
  planData: typeof PlanTable.$inferInsert,
  paymentData: {
    totalAmount: number;
    licenseServiceFee: number;
  }
) => {
  return await db.transaction(async (tx) => {
    let plan: typeof PlanTable.$inferSelect;

    // Upsert plan
    if (planData.id) {
      // Update existing plan
      const existingPlan = await tx.query.PlanTable.findFirst({
        where: eq(PlanTable.id, planData.id),
      });

      if (!existingPlan) {
        throw new Error('Plan not found');
      }

      [plan] = await tx
        .update(PlanTable)
        .set({
          ...planData,
          updatedAt: new Date(),
        })
        .where(eq(PlanTable.id, planData.id))
        .returning();

      if (plan.paymentId) {
        await db
          .update(PaymentTable)
          .set({
            branchId: planData.branchId,
            clientId: planData.clientId,
            totalAmount: paymentData.totalAmount,
            licenseServiceFee: paymentData.licenseServiceFee,
          })
          .where(eq(PaymentTable.id, plan.paymentId));
      }
    } else {
      // Create new Payment
      const [payment] = await tx
        .insert(PaymentTable)
        .values({
          branchId: planData.branchId,
          clientId: planData.clientId,
          totalAmount: paymentData.totalAmount,
          licenseServiceFee: paymentData.licenseServiceFee,
        })
        .returning();
      // Create new plan
      [plan] = await tx
        .insert(PlanTable)
        .values({
          ...planData,
          paymentId: payment.id,
        })
        .returning();
    }

    return {
      plan,
    };
  });
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
    },
  });

  return client;
};

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
      const [updated] = await tx
        .update(InstallmentPaymentTable)
        .set({
          amount: data.amount,
          paymentMode: data.paymentMode,
          paymentDate: data.paymentDate,
          isPaid: data.isPaid,
        })
        .where(eq(InstallmentPaymentTable.id, existingInstallment.id))
        .returning();

      // Recalculate payment status
      const allInstallments = await tx.query.InstallmentPaymentTable.findMany({
        where: eq(InstallmentPaymentTable.paymentId, data.paymentId),
      });

      const paidCount = allInstallments.filter((inst) => inst.isPaid).length;

      await tx
        .update(PaymentTable)
        .set({
          paymentStatus: calculatePaymentStatus(paidCount),
          updatedAt: new Date(),
        })
        .where(eq(PaymentTable.id, data.paymentId));

      return updated;
    }

    // Create new installment and update status
    const [created] = await tx.insert(InstallmentPaymentTable).values(data).returning();

    const allInstallments = await tx.query.InstallmentPaymentTable.findMany({
      where: eq(InstallmentPaymentTable.paymentId, data.paymentId),
    });

    const paidCount = allInstallments.filter((inst) => inst.isPaid).length;

    await tx
      .update(PaymentTable)
      .set({
        paymentStatus: calculatePaymentStatus(paidCount),
        updatedAt: new Date(),
      })
      .where(eq(PaymentTable.id, data.paymentId));

    return created;
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
    where: eq(VehicleTable.id, vehicleId),
    columns: { rent: true },
  });
};

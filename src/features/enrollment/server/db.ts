import { db } from '@/db';
import {
  ClientTable,
  PaymentTable,
  PlanTable,
  FullPaymentTable,
  InstallmentPaymentTable,
  VehicleTable,
} from '@/db/schema';
import { LearningLicenseTable } from '@/db/schema/learning-licenses/columns';
import { DrivingLicenseTable } from '@/db/schema/driving-licenses/columns';
import { eq, and, isNull } from 'drizzle-orm';
import { getNextClientCode } from '@/db/utils/client-code';
import { getNextPlanCode } from '@/db/utils/plan-code';

export const upsertClientInDB = async (
  data: Omit<typeof ClientTable.$inferInsert, 'clientCode'> & { clientCode?: string }
) => {
  // Create a variable to track if this was an update operation
  let isExistingClient = false;

  // Generate client code if not provided
  const clientCode = data.clientCode || (await getNextClientCode(data.tenantId));

  // Use onConflictDoUpdate to handle the case where a client with the same phone number and tenant already exists
  const [client] = await db
    .insert(ClientTable)
    .values({ ...data, clientCode })
    .onConflictDoUpdate({
      target: [ClientTable.phoneNumber, ClientTable.tenantId],
      set: {
        ...data,
        clientCode,
        updatedAt: new Date(),
      },
    })
    .returning();

  // Check if this was an update by comparing createdAt and updatedAt
  // If they're different by more than a few seconds, it was an update
  if (client.createdAt && client.updatedAt) {
    const timeDiff = Math.abs(client.updatedAt.getTime() - client.createdAt.getTime());
    isExistingClient = timeDiff > 1000; // More than 1 second difference
  }

  return {
    isExistingClient,
    clientId: client.id,
  };
};

export const upsertLearningLicenseInDB = async (data: typeof LearningLicenseTable.$inferInsert) => {
  // Create a variable to track if this was an update operation
  let isExistingLicense = false;

  // Use onConflictDoUpdate to handle the case where a license for this client already exists
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

  // Check if this was an update by comparing createdAt and updatedAt
  // If they're different by more than a few seconds, it was an update
  if (license.createdAt && license.updatedAt) {
    const timeDiff = Math.abs(license.updatedAt.getTime() - license.createdAt.getTime());
    isExistingLicense = timeDiff > 1000; // More than 1 second difference
  }

  return {
    license,
    isExistingLicense,
  };
};

export const upsertDrivingLicenseInDB = async (data: typeof DrivingLicenseTable.$inferInsert) => {
  // Create a variable to track if this was an update operation
  let isExistingLicense = false;

  // Use onConflictDoUpdate to handle the case where a license for this client already exists
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

  // Check if this was an update by comparing createdAt and updatedAt
  // If they're different by more than a few seconds, it was an update
  if (license.createdAt && license.updatedAt) {
    const timeDiff = Math.abs(license.updatedAt.getTime() - license.createdAt.getTime());
    isExistingLicense = timeDiff > 1000; // More than 1 second difference
  }

  return {
    license,
    isExistingLicense,
  };
};

export const createPlanInDB = async (
  data: Omit<typeof PlanTable.$inferInsert, 'planCode'> & { planCode?: string },
  tenantId: string
) => {
  // Validate plan data
  if (data.numberOfSessions <= 0) {
    throw new Error('Number of sessions must be greater than 0');
  }

  if (data.numberOfSessions > 100) {
    throw new Error('Number of sessions cannot exceed 100');
  }

  if (data.sessionDurationInMinutes <= 0) {
    throw new Error('Session duration must be greater than 0');
  }

  if (data.sessionDurationInMinutes > 240) {
    throw new Error('Session duration cannot exceed 240 minutes');
  }

  if (!data.vehicleId) {
    throw new Error('Vehicle ID is required');
  }

  if (!data.clientId) {
    throw new Error('Client ID is required');
  }

  if (!data.branchId) {
    throw new Error('Branch ID is required');
  }

  // Validate date is not too far in the past (allow same day)
  const joiningDate = new Date(data.joiningDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  joiningDate.setHours(0, 0, 0, 0);

  if (joiningDate < today) {
    throw new Error('Joining date cannot be in the past');
  }

  // Generate plan code if not provided
  const planCode = data.planCode || (await getNextPlanCode(tenantId));

  const [plan] = await db
    .insert(PlanTable)
    .values({ ...data, planCode })
    .returning();

  return {
    plan,
    planId: plan.id,
  };
};

export const updatePlanInDB = async (
  planId: string,
  data: Partial<Omit<typeof PlanTable.$inferInsert, 'planCode' | 'clientId'>>
) => {
  // Validate if present
  if (data.numberOfSessions !== undefined && data.numberOfSessions <= 0) {
    throw new Error('Number of sessions must be greater than 0');
  }

  if (data.numberOfSessions !== undefined && data.numberOfSessions > 100) {
    throw new Error('Number of sessions cannot exceed 100');
  }

  if (data.sessionDurationInMinutes !== undefined && data.sessionDurationInMinutes <= 0) {
    throw new Error('Session duration must be greater than 0');
  }

  if (data.sessionDurationInMinutes !== undefined && data.sessionDurationInMinutes > 240) {
    throw new Error('Session duration cannot exceed 240 minutes');
  }

  // Check if plan exists before updating
  const existingPlan = await db.query.PlanTable.findFirst({
    where: eq(PlanTable.id, planId),
  });

  if (!existingPlan) {
    throw new Error('Plan not found');
  }

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
    planId: plan.id,
  };
};

export const upsertPaymentInDB = async (data: typeof PaymentTable.$inferInsert, planId: string) => {
  return await db.transaction(async (tx) => {
    // Fetch plan with associated payment
    const planWithPayment = await tx.query.PlanTable.findFirst({
      where: eq(PlanTable.id, planId),
      with: { payment: true },
    });

    if (!planWithPayment) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const existingPayment = planWithPayment.payment;

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

    // Create new payment and link to plan
    const [created] = await tx.insert(PaymentTable).values(data).returning();

    await tx
      .update(PlanTable)
      .set({ paymentId: created.id, updatedAt: new Date() })
      .where(eq(PlanTable.id, planId));

    return {
      payment: created,
      isExistingPayment: false,
      paymentId: created.id,
    };
  });
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

export const createFullPaymentInDB = async (data: typeof FullPaymentTable.$inferInsert) => {
  return await db.transaction(async (tx) => {
    // Check if full payment already exists
    const existingFullPayment = await tx.query.FullPaymentTable.findFirst({
      where: eq(FullPaymentTable.paymentId, data.paymentId),
    });

    // Update existing payment record
    if (existingFullPayment) {
      const [updated] = await tx
        .update(FullPaymentTable)
        .set({
          paymentMode: data.paymentMode,
          paymentDate: data.paymentDate,
          isPaid: data.isPaid,
        })
        .where(eq(FullPaymentTable.paymentId, data.paymentId))
        .returning();

      return updated;
    }

    // Create new full payment and update status
    const [created] = await tx.insert(FullPaymentTable).values(data).returning();

    await tx
      .update(PaymentTable)
      .set({
        paymentStatus: 'FULLY_PAID',
        updatedAt: new Date(),
      })
      .where(eq(PaymentTable.id, data.paymentId));

    return created;
  });
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

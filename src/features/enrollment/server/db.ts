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
  // Validate payment amounts
  if (data.finalAmount < 0) {
    throw new Error('Final amount cannot be negative');
  }

  if (data.discount && data.discount > data.originalAmount) {
    throw new Error('Discount cannot exceed original amount');
  }

  const response = await db.transaction(async (tx) => {
    // Check if payment already exists for this plan
    const existingPayment = await tx.query.PlanTable.findFirst({
      where: eq(PlanTable.id, planId),
      with: {
        payment: true,
      },
    });

    let isExistingPayment = false;
    let payment;

    if (existingPayment?.payment) {
      // Update existing payment
      isExistingPayment = true;
      const [updated] = await tx
        .update(PaymentTable)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(PaymentTable.id, existingPayment.payment.id))
        .returning();

      payment = updated;
    } else {
      // Create new payment
      const [created] = await tx.insert(PaymentTable).values(data).returning();
      payment = created;

      // Link payment to plan
      await tx
        .update(PlanTable)
        .set({
          paymentId: payment.id,
          updatedAt: new Date(),
        })
        .where(eq(PlanTable.id, planId));
    }

    return {
      payment,
      isExistingPayment,
      paymentId: payment.id,
    };
  });

  return response;
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
  const response = await db.transaction(async (tx) => {
    // Check if full payment already exists to prevent duplicates
    const existingFullPayment = await tx.query.FullPaymentTable.findFirst({
      where: eq(FullPaymentTable.paymentId, data.paymentId),
    });

    if (existingFullPayment) {
      // Update existing record instead of creating duplicate
      const [updatedPayment] = await tx
        .update(FullPaymentTable)
        .set({
          paymentMode: data.paymentMode,
          paymentDate: data.paymentDate,
          isPaid: data.isPaid,
        })
        .where(eq(FullPaymentTable.paymentId, data.paymentId))
        .returning();

      return updatedPayment;
    }

    // Create new full payment record
    const [fullPayment] = await tx.insert(FullPaymentTable).values(data).returning();

    // Update payment status
    await tx
      .update(PaymentTable)
      .set({
        paymentStatus: 'FULLY_PAID',
        updatedAt: new Date(),
      })
      .where(eq(PaymentTable.id, data.paymentId));

    return fullPayment;
  });

  return response;
};

export const createInstallmentPaymentsInDB = async (
  data: typeof InstallmentPaymentTable.$inferInsert
) => {
  const response = await db.transaction(async (tx) => {
    // Check if this specific installment already exists
    const existingInstallment = await tx.query.InstallmentPaymentTable.findFirst({
      where: and(
        eq(InstallmentPaymentTable.paymentId, data.paymentId),
        eq(InstallmentPaymentTable.installmentNumber, data.installmentNumber)
      ),
    });

    let installmentPayment;

    if (existingInstallment) {
      // Update existing installment instead of creating duplicate
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

      installmentPayment = updated;
    } else {
      // Create new installment
      const [created] = await tx.insert(InstallmentPaymentTable).values(data).returning();
      installmentPayment = created;
    }

    // Get all installments to determine payment status
    const allInstallments = await tx.query.InstallmentPaymentTable.findMany({
      where: eq(InstallmentPaymentTable.paymentId, data.paymentId),
    });

    const paidInstallments = allInstallments.filter((inst) => inst.isPaid);
    const paymentStatus =
      paidInstallments.length === 0
        ? 'PENDING'
        : paidInstallments.length === 1
          ? 'PARTIALLY_PAID'
          : 'FULLY_PAID';

    // Update payment status based on actual installments
    await tx
      .update(PaymentTable)
      .set({
        paymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(PaymentTable.id, data.paymentId));

    return installmentPayment;
  });

  return response;
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

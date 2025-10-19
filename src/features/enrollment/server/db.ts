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
import { triggerDLTestEligibilityWorkflow } from '@/lib/upstash/trigger-dl-test-eligibility';

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

  // Trigger DL test eligibility workflow when LL is issued
  if (license.issueDate) {
    await triggerDLTestEligibilityWorkflow({
      learningLicenseId: license.id,
      issueDate: license.issueDate,
    });
  }

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

  const existingPlan = await db.query.PlanTable.findFirst({
    where: eq(PlanTable.paymentId, planData.paymentId),
  });

  if (existingPlan) {
    console.log(
      '⚠️ [Plan DB] Found existing plan with same paymentId, updating instead of creating new one:',
      existingPlan.id
    );
    // Update the existing plan instead of creating a new one
    const [plan] = await db
      .update(PlanTable)
      .set({
        ...planData,
        id: existingPlan.id, // Keep the existing ID
        updatedAt: new Date(),
      })
      .where(eq(PlanTable.id, existingPlan.id))
      .returning();

    console.log('✅ [Plan DB] Updated existing plan successfully');
    return {
      plan,
    };
  }

  // Create new plan
  console.log('🆕 [Plan DB] Creating new plan with paymentId:', planData.paymentId);
  try {
    const [plan] = await db.insert(PlanTable).values(planData).returning();
    console.log('✅ [Plan DB] Created new plan successfully:', plan.id);
    return {
      plan,
    };
  } catch (error) {
    console.error('❌ [Plan DB] Error creating plan:', error);

    // If we still get a duplicate key error, try to find and update the existing plan
    if (
      error instanceof Error &&
      error.message.includes('duplicate key value violates unique constraint')
    ) {
      console.log(
        '🔄 [Plan DB] Duplicate key error detected, attempting to find and update existing plan'
      );

      const existingPlan = await db.query.PlanTable.findFirst({
        where: eq(PlanTable.paymentId, planData.paymentId),
      });

      if (existingPlan) {
        console.log(
          '🔍 [Plan DB] Found existing plan after duplicate error, updating:',
          existingPlan.id
        );
        const [plan] = await db
          .update(PlanTable)
          .set({
            ...planData,
            id: existingPlan.id,
            updatedAt: new Date(),
          })
          .where(eq(PlanTable.id, existingPlan.id))
          .returning();

        return {
          plan,
        };
      }
    }

    throw error;
  }
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
      const newPaymentStatus = calculatePaymentStatus(paidCount);

      const [updatedPayment] = await tx
        .update(PaymentTable)
        .set({
          paymentStatus: newPaymentStatus,
          updatedAt: new Date(),
        })
        .where(eq(PaymentTable.id, data.paymentId))
        .returning();

      // Send payment receipt if payment was made
      if (data.isPaid) {
        try {
          await sendInstallmentPaymentReceipt(
            data.paymentId,
            data.installmentNumber || 1,
            data.amount,
            data.paymentMode || 'CASH',
            newPaymentStatus
          );
        } catch (error) {
          console.error('❌ [Installment Receipt] Failed to send payment receipt:', error);
          // Don't fail the payment transaction if messaging fails
        }
      }

      return updatedPayment;
    }

    // Create new installment and update status
    await tx.insert(InstallmentPaymentTable).values(data);

    const allInstallments = await tx.query.InstallmentPaymentTable.findMany({
      where: eq(InstallmentPaymentTable.paymentId, data.paymentId),
    });

    const paidCount = allInstallments.filter((inst) => inst.isPaid).length;
    const newPaymentStatus = calculatePaymentStatus(paidCount);

    const [updatedPayment] = await tx
      .update(PaymentTable)
      .set({
        paymentStatus: newPaymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(PaymentTable.id, data.paymentId))
      .returning();

    // Send payment receipt if payment was made
    if (data.isPaid) {
      try {
        await sendInstallmentPaymentReceipt(
          data.paymentId,
          data.installmentNumber || 1,
          data.amount,
          data.paymentMode || 'CASH',
          newPaymentStatus
        );
      } catch (error) {
        console.error('❌ [Installment Receipt] Failed to send payment receipt:', error);
        // Don't fail the payment transaction if messaging fails
      }
    }

    return updatedPayment;
  });
};

// Helper function to send payment receipt for installment payments
async function sendInstallmentPaymentReceipt(
  paymentId: string,
  installmentNumber: number,
  amount: number,
  paymentMode: string,
  paymentStatus: string
) {
  console.log(
    '📱 [Installment Receipt] Sending installment payment receipt for payment:',
    paymentId
  );

  try {
    // Get payment with client information
    const payment = await db.query.PaymentTable.findFirst({
      where: eq(PaymentTable.id, paymentId),
      with: {
        client: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (!payment || !payment.client) {
      console.log('❌ [Installment Receipt] Payment or client not found');
      return;
    }

    // Import payment service dynamically to avoid circular dependencies
    const { sendPaymentReceipt } = await import('@/lib/whatsapp/services/payment-service');

    const remainingAmount = paymentStatus === 'FULLY_PAID' ? 0 : payment.totalAmount - amount;

    const paymentReceiptResult = await sendPaymentReceipt(payment.client, {
      amount: amount,
      date: new Date(),
      type: 'installment',
      paymentMode: paymentMode,
      transactionReference: `PAY-${payment.id}-INST-${installmentNumber}`,
      totalAmount: payment.totalAmount,
      remainingAmount: remainingAmount,
      installmentNumber: installmentNumber,
    });

    console.log('📱 [Installment Receipt] Payment receipt result:', paymentReceiptResult);
  } catch (error) {
    console.error('❌ [Installment Receipt] Error sending payment receipt:', error);
  }
}

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

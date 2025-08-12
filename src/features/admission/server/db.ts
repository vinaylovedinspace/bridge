import { db } from '@/db';
import { ClientTable, PaymentTable, PlanTable } from '@/db/schema';
import { LearningLicenseTable } from '@/db/schema/learning-licenses/columns';
import { DrivingLicenseTable } from '@/db/schema/driving-licenses/columns';
import { eq } from 'drizzle-orm';
import { getNextClientCode } from '@/db/utils/client-code';
import { schedulePaymentReminders } from '@/features/admission/hooks/use-payment-workflow';

export const upsertClientInDB = async (data: typeof ClientTable.$inferInsert) => {
  // Create a variable to track if this was an update operation
  let isExistingClient = false;

  // Generate client code if not provided
  if (!data.clientCode) {
    data.clientCode = await getNextClientCode(data.tenantId);
  }

  // Use onConflictDoUpdate to handle the case where a client with the same phone number and tenant already exists
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

export const upsertPlanInDB = async (data: typeof PlanTable.$inferInsert) => {
  // Create a variable to track if this was an update operation
  let isExistingPlan = false;

  const [plan] = await db
    .insert(PlanTable)
    .values(data)
    .onConflictDoUpdate({
      target: PlanTable.clientId,
      set: {
        ...data,
        updatedAt: new Date(),
      },
    })
    .returning();

  // Check if this was an update by comparing createdAt and updatedAt
  // If they're different by more than a few seconds, it was an update
  if (plan.createdAt && plan.updatedAt) {
    const timeDiff = Math.abs(plan.updatedAt.getTime() - plan.createdAt.getTime());
    isExistingPlan = timeDiff > 1000; // More than 1 second difference
  }

  return {
    plan,
    isExistingPlan,
    planId: plan.id,
  };
};

export const upsertPaymentInDB = async (data: typeof PaymentTable.$inferInsert) => {
  // Create a variable to track if this was an update operation
  let isExistingPayment = false;

  const [payment] = await db
    .insert(PaymentTable)
    .values(data)
    .onConflictDoUpdate({
      target: PaymentTable.planId,
      set: {
        ...data,
        updatedAt: new Date(),
      },
    })
    .returning();

  // Check if this was an update by comparing createdAt and updatedAt
  // If they're different by more than a few seconds, it was an update
  if (payment.createdAt && payment.updatedAt) {
    const timeDiff = Math.abs(payment.updatedAt.getTime() - payment.createdAt.getTime());
    isExistingPayment = timeDiff > 1000; // More than 1 second difference
  }

  // Schedule workflow reminders for new payments
  if (!isExistingPayment && payment.paymentType) {
    try {
      await schedulePaymentReminders(
        payment.id,
        payment.paymentType,
        payment.firstInstallmentDate ? new Date(payment.firstInstallmentDate) : null,
        payment.secondInstallmentDate ? new Date(payment.secondInstallmentDate) : null,
        payment.paymentDueDate ? new Date(payment.paymentDueDate) : null
      );
    } catch (error) {
      console.error('Failed to schedule payment reminders:', error);
      // Don't throw error to avoid blocking payment creation
    }
  }

  return {
    payment,
    isExistingPayment,
    paymentId: payment.id,
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

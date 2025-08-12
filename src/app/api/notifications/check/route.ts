import { NextResponse } from 'next/server';
import { db } from '@/db';
import {
  ClientTable as clients,
  PaymentTable as payments,
  VehicleTable as vehicles,
  SessionTable as sessions,
  LearningLicenseTable as learningLicenses,
  BranchTable as branches,
} from '@/db/schema';

import { and, eq, lte, gte, isNull, or } from 'drizzle-orm';
import { NotificationService } from '@/lib/notifications/notification-service';
import { addDays, startOfDay } from 'date-fns';

// This endpoint should be called by a cron job every hour
export async function POST(request: Request) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get all branches for notification generation
    const allBranches = await db.select().from(branches);

    for (const branch of allBranches) {
      await Promise.all([
        checkOverduePayments(branch.id, branch.tenantId),
        checkUpcomingInstallments(branch.id, branch.tenantId, todayString),
        checkPaymentReminders(branch.id, branch.tenantId), // New function for payment reminders
        checkLearningTests(branch.id, branch.tenantId, todayString),
        checkDrivingTestEligibility(branch.id, branch.tenantId),
        checkVehicleDocuments(branch.id, branch.tenantId),
        checkTodaysSessions(branch.id, branch.tenantId, todayString),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to check notifications:', error);
    return NextResponse.json({ error: 'Failed to check notifications' }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function checkOverduePayments(branchId: string, _tenantId: string) {
  const today = new Date().toISOString().split('T')[0];

  const overduePayments = await db
    .select({
      payment: payments,
      client: clients,
    })
    .from(payments)
    .innerJoin(clients, eq(payments.clientId, clients.id))
    .where(
      and(
        eq(clients.branchId, branchId),
        or(
          and(
            eq(payments.paymentType, 'INSTALLMENTS'),
            eq(payments.firstInstallmentPaid, false),
            lte(payments.firstInstallmentDate, today)
          ),
          and(
            eq(payments.paymentType, 'INSTALLMENTS'),
            eq(payments.secondInstallmentPaid, false),
            lte(payments.secondInstallmentDate, today)
          )
        )
      )
    );

  for (const record of overduePayments) {
    const installmentNumber = !record.payment.firstInstallmentPaid ? 1 : 2;
    const dueDate =
      installmentNumber === 1
        ? record.payment.firstInstallmentDate
        : record.payment.secondInstallmentDate;

    await NotificationService.notifyInstallmentDue(
      record.client.id,
      branchId,
      record.payment.id,
      installmentNumber as 1 | 2,
      dueDate ? new Date(dueDate) : null,
      true // isOverdue
    );
  }
}

async function checkUpcomingInstallments(branchId: string, tenantId: string, todayString: string) {
  const todaysInstallments = await db
    .select({
      payment: payments,
      client: clients,
    })
    .from(payments)
    .innerJoin(clients, eq(payments.clientId, clients.id))
    .where(
      and(
        eq(clients.branchId, branchId),
        eq(payments.paymentType, 'INSTALLMENTS'),
        or(
          and(
            eq(payments.firstInstallmentPaid, false),
            eq(payments.firstInstallmentDate, todayString)
          ),
          and(
            eq(payments.secondInstallmentPaid, false),
            eq(payments.secondInstallmentDate, todayString)
          )
        )
      )
    );

  for (const record of todaysInstallments) {
    const installmentNumber = !record.payment.firstInstallmentPaid ? 1 : 2;
    const dueDate =
      installmentNumber === 1
        ? record.payment.firstInstallmentDate
        : record.payment.secondInstallmentDate;

    await NotificationService.notifyInstallmentDue(
      record.client.id,
      branchId,
      record.payment.id,
      installmentNumber as 1 | 2,
      dueDate ? new Date(dueDate) : null,
      false // isOverdue
    );
  }
}

async function checkLearningTests(branchId: string, tenantId: string, todayString: string) {
  const learningTests = await db
    .select({
      license: learningLicenses,
      client: clients,
    })
    .from(learningLicenses)
    .innerJoin(clients, eq(learningLicenses.clientId, clients.id))
    .where(
      and(
        eq(clients.branchId, branchId),
        eq(learningLicenses.testConductedOn, todayString),
        isNull(learningLicenses.licenseNumber)
      )
    );

  for (const record of learningTests) {
    await NotificationService.notifyLearningTestToday({
      tenantId,
      branchId,
      userId: 'system',
      clientName: `${record.client.firstName} ${record.client.lastName}`,
      clientId: record.client.id,
    });
  }
}

async function checkDrivingTestEligibility(branchId: string, tenantId: string) {
  const thirtyDaysAgo = addDays(new Date(), -30).toISOString().split('T')[0];

  const eligibleClients = await db
    .select({
      license: learningLicenses,
      client: clients,
    })
    .from(learningLicenses)
    .innerJoin(clients, eq(learningLicenses.clientId, clients.id))
    .where(
      and(
        eq(clients.branchId, branchId),
        lte(learningLicenses.issueDate, thirtyDaysAgo),
        isNull(learningLicenses.expiryDate) // Active license has no expiry set yet
      )
    );

  for (const record of eligibleClients) {
    await NotificationService.notifyEligibleForDrivingTest({
      tenantId,
      branchId,
      userId: 'system',
      clientName: `${record.client.firstName} ${record.client.lastName}`,
      clientId: record.client.id,
    });
  }
}

async function checkVehicleDocuments(branchId: string, tenantId: string) {
  const today = new Date();
  const thirtyDaysFromNow = addDays(today, 30).toISOString().split('T')[0];
  const todayString = today.toISOString().split('T')[0];

  // Check PUC expiry dates from vehicles table
  const expiringPucVehicles = await db
    .select()
    .from(vehicles)
    .where(
      and(
        eq(vehicles.branchId, branchId),
        lte(vehicles.pucExpiry, thirtyDaysFromNow),
        gte(vehicles.pucExpiry, todayString)
      )
    );

  // Check Insurance expiry dates from vehicles table
  const expiringInsuranceVehicles = await db
    .select()
    .from(vehicles)
    .where(
      and(
        eq(vehicles.branchId, branchId),
        lte(vehicles.insuranceExpiry, thirtyDaysFromNow),
        gte(vehicles.insuranceExpiry, todayString)
      )
    );

  // Check Registration expiry dates from vehicles table
  const expiringRegistrationVehicles = await db
    .select()
    .from(vehicles)
    .where(
      and(
        eq(vehicles.branchId, branchId),
        lte(vehicles.registrationExpiry, thirtyDaysFromNow),
        gte(vehicles.registrationExpiry, todayString)
      )
    );

  // Notify for expiring documents
  for (const vehicle of expiringPucVehicles) {
    if (vehicle.pucExpiry) {
      const daysUntilExpiry = Math.ceil(
        (new Date(vehicle.pucExpiry).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry === 30 || daysUntilExpiry === 7 || daysUntilExpiry === 1) {
        await NotificationService.notifyVehicleDocumentExpiring({
          tenantId,
          branchId,
          userId: 'system',
          vehicleNumber: vehicle.number,
          documentType: 'PUC',
          daysUntilExpiry,
          vehicleId: vehicle.id,
        });
      }
    }
  }

  for (const vehicle of expiringInsuranceVehicles) {
    if (vehicle.insuranceExpiry) {
      const daysUntilExpiry = Math.ceil(
        (new Date(vehicle.insuranceExpiry).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry === 30 || daysUntilExpiry === 7 || daysUntilExpiry === 1) {
        await NotificationService.notifyVehicleDocumentExpiring({
          tenantId,
          branchId,
          userId: 'system',
          vehicleNumber: vehicle.number,
          documentType: 'Insurance',
          daysUntilExpiry,
          vehicleId: vehicle.id,
        });
      }
    }
  }

  for (const vehicle of expiringRegistrationVehicles) {
    if (vehicle.registrationExpiry) {
      const daysUntilExpiry = Math.ceil(
        (new Date(vehicle.registrationExpiry).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry === 30 || daysUntilExpiry === 7 || daysUntilExpiry === 1) {
        await NotificationService.notifyVehicleDocumentExpiring({
          tenantId,
          branchId,
          userId: 'system',
          vehicleNumber: vehicle.number,
          documentType: 'Registration',
          daysUntilExpiry,
          vehicleId: vehicle.id,
        });
      }
    }
  }
}

async function checkTodaysSessions(branchId: string, tenantId: string, todayString: string) {
  const cancelledSessions = await db
    .select({
      session: sessions,
      client: clients,
    })
    .from(sessions)
    .innerJoin(clients, eq(sessions.clientId, clients.id))
    .where(
      and(
        eq(clients.branchId, branchId),
        eq(sessions.sessionDate, todayString),
        eq(sessions.status, 'CANCELLED')
      )
    );

  for (const record of cancelledSessions) {
    const sessionTime = `${record.session.startTime} - ${record.session.endTime}`;

    await NotificationService.notifySessionToday({
      tenantId,
      branchId,
      userId: 'system',
      clientName: `${record.client.firstName} ${record.client.lastName}`,
      sessionTime,
      sessionId: record.session.id,
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function checkPaymentReminders(branchId: string, _tenantId: string) {
  const today = startOfDay(new Date());

  // Check for installment reminders
  const installmentPayments = await db
    .select({
      payment: payments,
      client: clients,
    })
    .from(payments)
    .innerJoin(clients, eq(payments.clientId, clients.id))
    .where(and(eq(clients.branchId, branchId), eq(payments.paymentType, 'INSTALLMENTS')));

  for (const record of installmentPayments) {
    const { payment } = record;

    // Check first installment reminders
    if (!payment.firstInstallmentPaid && payment.firstInstallmentDate) {
      const firstDueDate = new Date(payment.firstInstallmentDate);

      // Overdue reminders (1, 3, 7 days after)
      const daysOverdue = Math.ceil(
        (today.getTime() - firstDueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysOverdue === 1 || daysOverdue === 3 || daysOverdue === 7) {
        await NotificationService.notifyInstallmentDue(
          payment.clientId,
          payment.planId,
          payment.id,
          1,
          firstDueDate,
          true
        );
      }
    }

    // Check second installment reminders
    if (!payment.secondInstallmentPaid && payment.secondInstallmentDate) {
      const secondDueDate = new Date(payment.secondInstallmentDate);

      // Overdue reminders (1, 3, 7 days after)
      const daysOverdue = Math.ceil(
        (today.getTime() - secondDueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysOverdue === 1 || daysOverdue === 3 || daysOverdue === 7) {
        await NotificationService.notifyInstallmentDue(
          payment.clientId,
          payment.planId,
          payment.id,
          2,
          secondDueDate,
          true
        );
      }
    }
  }

  // Check for pay later reminders
  const payLaterPayments = await db
    .select({
      payment: payments,
      client: clients,
    })
    .from(payments)
    .innerJoin(clients, eq(payments.clientId, clients.id))
    .where(
      and(
        eq(clients.branchId, branchId),
        eq(payments.paymentType, 'PAY_LATER'),
        eq(payments.paymentStatus, 'PENDING')
      )
    );

  for (const record of payLaterPayments) {
    const { payment } = record;

    if (payment.paymentDueDate) {
      const dueDate = new Date(payment.paymentDueDate);

      // Overdue reminders (1, 3, 7 days after)
      const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysOverdue === 1 || daysOverdue === 3 || daysOverdue === 7) {
        await NotificationService.notifyPayLaterDue(
          payment.clientId,
          payment.planId,
          payment.id,
          dueDate,
          true
        );
      }
    }
  }
}

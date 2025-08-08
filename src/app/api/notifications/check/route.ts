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
import { addDays } from 'date-fns';

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

async function checkOverduePayments(branchId: string, tenantId: string) {
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

  const notifications = overduePayments.map((record) => {
    const amount = !record.payment.firstInstallmentPaid
      ? record.payment.firstInstallmentAmount
      : record.payment.secondInstallmentAmount;

    return {
      tenantId,
      branchId,
      userId: 'system', // TODO: Get actual user for notifications
      clientName: `${record.client.firstName} ${record.client.lastName}`,
      amount: amount || 0,
      clientId: record.client.id,
      isOverdue: true,
    };
  });

  for (const notification of notifications) {
    await NotificationService.notifyInstallmentDue(notification);
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

  const notifications = todaysInstallments.map((record) => {
    const amount = !record.payment.firstInstallmentPaid
      ? record.payment.firstInstallmentAmount
      : record.payment.secondInstallmentAmount;

    return {
      tenantId,
      branchId,
      userId: 'system',
      clientName: `${record.client.firstName} ${record.client.lastName}`,
      amount: amount || 0,
      clientId: record.client.id,
      isOverdue: false,
    };
  });

  for (const notification of notifications) {
    await NotificationService.notifyInstallmentDue(notification);
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
  const todaysSessions = await db
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
        eq(sessions.status, 'SCHEDULED')
      )
    );

  for (const record of todaysSessions) {
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

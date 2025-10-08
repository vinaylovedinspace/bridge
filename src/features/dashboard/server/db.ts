import { db } from '@/db';
import {
  ClientTable,
  LearningLicenseTable,
  PlanTable,
  RTOServicesTable,
  SessionTable,
  StaffTable,
} from '@/db/schema';
import { isPaymentOverdue } from '@/lib/payment/is-payment-overdue';
import { and, count, countDistinct, eq, gte, inArray, isNull, sql } from 'drizzle-orm';

export const getAdmissionStatistics = async (branchId: string, months: number = 6) => {
  // Calculate the date from `months` ago
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - months);

  const result = await db
    .select({
      month: sql<string>`TO_CHAR(${ClientTable.createdAt}, 'YYYY-MM')`.as('month'),
      count: count(ClientTable.id).as('count'),
    })
    .from(ClientTable)
    .where(and(eq(ClientTable.branchId, branchId), gte(ClientTable.createdAt, fromDate)))
    .groupBy(sql`TO_CHAR(${ClientTable.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${ClientTable.createdAt}, 'YYYY-MM')`);

  // Transform the result to include month names and ensure we have data for all months
  const monthsData: { month: string; users: number; fullMonth: string }[] = [];

  // Create array of last N months
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const fullMonthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const monthAbbr = monthNames[date.getMonth()];
    const fullMonth = fullMonthNames[date.getMonth()];

    // Find matching data from database
    const dbData = result.find((r) => r.month === monthKey);

    monthsData.push({
      month: monthAbbr,
      users: dbData ? Number(dbData.count) : 0,
      fullMonth: fullMonth,
    });
  }

  return monthsData;
};

export const getLicenceWorkCount = async (branchId: string) => {
  const learningTestCountResult = await db
    .select({ count: countDistinct(ClientTable.id) })
    .from(ClientTable)
    .innerJoin(PlanTable, eq(ClientTable.id, PlanTable.clientId))
    .leftJoin(LearningLicenseTable, eq(ClientTable.id, LearningLicenseTable.clientId))
    .where(
      and(
        eq(ClientTable.branchId, branchId),
        eq(PlanTable.serviceType, 'FULL_SERVICE'),
        sql`(${LearningLicenseTable.licenseNumber} IS NULL OR ${LearningLicenseTable.licenseNumber} = '')`
      )
    );

  // Final Test Count: Clients with FULL_SERVICE plans who got their learning license 30+ days ago
  const finalTestCountResult = await db
    .select({ count: countDistinct(ClientTable.id) })
    .from(ClientTable)
    .innerJoin(PlanTable, eq(ClientTable.id, PlanTable.clientId))
    .innerJoin(LearningLicenseTable, eq(ClientTable.id, LearningLicenseTable.clientId))
    .where(
      and(
        eq(ClientTable.branchId, branchId),
        eq(PlanTable.serviceType, 'FULL_SERVICE'),
        sql`${LearningLicenseTable.issueDate} IS NOT NULL`,
        sql`CURRENT_DATE - CAST(${LearningLicenseTable.issueDate} AS DATE) >= 30`
      )
    );

  // RTO Work Count: Count of uncompleted RTO services (not completed, rejected, or cancelled)
  const rtoWorkCountResult = await db
    .select({ count: countDistinct(RTOServicesTable.id) })
    .from(RTOServicesTable)
    .where(
      and(
        eq(RTOServicesTable.branchId, branchId),
        inArray(RTOServicesTable.status, [
          'PENDING',
          'DOCUMENT_COLLECTION',
          'APPLICATION_SUBMITTED',
          'UNDER_REVIEW',
        ])
      )
    );

  return {
    learningTestCount: learningTestCountResult[0]?.count || 0,
    finalTestCount: finalTestCountResult[0]?.count || 0,
    rtoWorkCount: rtoWorkCountResult[0]?.count || 0,
  };
};

export const getOverduePaymentsCount = async (branchId: string) => {
  const conditions = [eq(PlanTable.branchId, branchId)];

  const clients = await db.query.ClientTable.findMany({
    where: and(...conditions),
    with: {
      plan: {
        with: {
          payment: {
            with: {
              installmentPayments: true,
              fullPayment: true,
            },
          },
        },
      },
      rtoServices: {
        with: {
          payment: {
            with: {
              fullPayment: true,
            },
          },
        },
      },
    },
  });

  let overdueCount = 0;

  clients.forEach((client) => {
    client.plan.forEach((plan) => {
      if (!plan.payment) {
        overdueCount++;
      }
      if (isPaymentOverdue(plan.payment, plan)) {
        overdueCount++;
      }
    });
    client.rtoServices.forEach((rtoService) => {
      if (!rtoService.payment) {
        overdueCount++;
      }
      if (rtoService.payment && rtoService.payment.paymentStatus !== 'FULLY_PAID') {
        overdueCount++;
      }
    });
  });

  return overdueCount;
};

export const getInstructorStatusCount = async (branchId: string) => {
  const today = new Date().toISOString().split('T')[0];

  // Get all instructors for the branch
  const instructors = await db.query.StaffTable.findMany({
    where: and(
      eq(StaffTable.branchId, branchId),
      eq(StaffTable.staffRole, 'instructor'),
      isNull(StaffTable.deletedAt)
    ),
    columns: {
      id: true,
      assignedVehicleId: true,
    },
  });

  // Count active instructors (those with IN_PROGRESS sessions today)
  const activeInstructorsQuery = await db
    .select({ count: count() })
    .from(SessionTable)
    .innerJoin(StaffTable, eq(SessionTable.vehicleId, StaffTable.assignedVehicleId))
    .where(
      and(
        eq(SessionTable.sessionDate, today),
        eq(SessionTable.status, 'IN_PROGRESS'),
        eq(StaffTable.branchId, branchId),
        eq(StaffTable.staffRole, 'instructor'),
        isNull(StaffTable.deletedAt)
      )
    );

  const activeCount = activeInstructorsQuery[0]?.count || 0;
  const totalInstructors = instructors.length;
  const inactiveCount = totalInstructors - activeCount;

  return {
    active: activeCount,
    inactive: inactiveCount,
    total: totalInstructors,
  };
};

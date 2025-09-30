import { db } from '@/db';
import {
  ClientTable,
  PaymentTable,
  SessionTable,
  LearningLicenseTable,
  DrivingLicenseTable,
  PlanTable,
} from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, ilike, and, desc, or, count, gte, sql } from 'drizzle-orm';
import { getBranchConfig } from './branch';

const _getClients = async (
  branchId: string,
  name?: string,
  paymentStatus?: string,
  needsLearningTest?: boolean
) => {
  const conditions = [eq(ClientTable.branchId, branchId)];

  if (name) {
    conditions.push(
      or(ilike(ClientTable.firstName, `%${name}%`), ilike(ClientTable.lastName, `%${name}%`))!
    );
  }

  if (needsLearningTest) {
    conditions.push(
      eq(ClientTable.serviceType, 'FULL_SERVICE'),
      sql`(${LearningLicenseTable.licenseNumber} IS NULL OR ${LearningLicenseTable.licenseNumber} = '')`
    );
  }

  // First, get the basic client information
  const baseQuery = db
    .select({
      id: ClientTable.id,
      firstName: ClientTable.firstName,
      middleName: ClientTable.middleName,
      lastName: ClientTable.lastName,
      phoneNumber: ClientTable.phoneNumber,
      email: ClientTable.email,
      address: ClientTable.address,
      city: ClientTable.city,
      state: ClientTable.state,
      clientCode: ClientTable.clientCode,
      serviceType: ClientTable.serviceType,
      createdAt: ClientTable.createdAt,
      paymentStatus: PaymentTable.paymentStatus,
      hasLearningLicense: LearningLicenseTable.id,
      learningLicenseNumber: LearningLicenseTable.licenseNumber,
      hasDrivingLicense: DrivingLicenseTable.id,
      hasPlan: PlanTable.id,
      hasPayment: PaymentTable.id,
    })
    .from(ClientTable)
    .leftJoin(PaymentTable, eq(ClientTable.id, PaymentTable.clientId))
    .leftJoin(LearningLicenseTable, eq(ClientTable.id, LearningLicenseTable.clientId))
    .leftJoin(DrivingLicenseTable, eq(ClientTable.id, DrivingLicenseTable.clientId))
    .leftJoin(PlanTable, eq(ClientTable.id, PlanTable.clientId))
    .where(and(...conditions))
    .orderBy(desc(ClientTable.createdAt));

  const clients = await baseQuery;

  // Get session counts for each client
  const clientsWithSessions = await Promise.all(
    clients.map(async (client) => {
      // Count total sessions
      const totalSessions = await db
        .select({ count: count() })
        .from(SessionTable)
        .where(eq(SessionTable.clientId, client.id));

      // Count completed sessions
      const completedSessions = await db
        .select({ count: count() })
        .from(SessionTable)
        .where(and(eq(SessionTable.clientId, client.id), eq(SessionTable.status, 'COMPLETED')));

      // Count cancelled sessions
      const cancelledSessions = await db
        .select({ count: count() })
        .from(SessionTable)
        .where(and(eq(SessionTable.clientId, client.id), eq(SessionTable.status, 'CANCELLED')));

      // Count remaining sessions (scheduled or rescheduled)
      const remainingSessions = await db
        .select({ count: count() })
        .from(SessionTable)
        .where(
          and(
            eq(SessionTable.clientId, client.id),
            or(eq(SessionTable.status, 'SCHEDULED'), eq(SessionTable.status, 'RESCHEDULED'))
          )
        );

      const unassignedSessions = await db
        .select({ count: count() })
        .from(SessionTable)
        .where(and(eq(SessionTable.clientId, client.id), eq(SessionTable.status, 'CANCELLED')));

      // Determine completion status
      // A client is complete if they have at least a plan and payment
      // Licenses are optional but plan and payment are required
      const isComplete = !!(client.hasPlan && client.hasPayment);

      return {
        ...client,
        totalSessions: totalSessions[0]?.count || 0,
        completedSessions: completedSessions[0]?.count || 0,
        cancelledSessions: cancelledSessions[0]?.count || 0,
        remainingSessions: remainingSessions[0]?.count || 0,
        unassignedSessions: unassignedSessions[0]?.count || 0,
        isComplete,
        completionStatus: isComplete ? ('COMPLETE' as const) : ('INCOMPLETE' as const),
      };
    })
  );

  if (paymentStatus && paymentStatus !== 'ALL') {
    return clientsWithSessions.filter(
      (client) =>
        client.paymentStatus === paymentStatus ||
        (paymentStatus === 'NO_PAYMENT' && !client.paymentStatus)
    );
  }

  return clientsWithSessions;
};

export const getClients = async (
  name?: string,
  paymentStatus?: string,
  needsLearningTest?: boolean
) => {
  const { userId } = await auth();
  const { id: branchId } = await getBranchConfig();

  if (!userId || !branchId) {
    return [];
  }

  return await _getClients(branchId, name, paymentStatus, needsLearningTest);
};

const _getClient = async (id: string) => {
  const client = await db.query.ClientTable.findFirst({
    where: eq(ClientTable.id, id),
    with: {
      learningLicense: true,
      drivingLicense: true,
      plan: {
        with: {
          vehicle: true,
          payment: true,
        },
      },
    },
  });

  return client;
};

export const getClient = async (id: string) => {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  return await _getClient(id);
};

const _getClientsWithUnassignedSessions = async (branchId: string) => {
  // Get clients who have cancelled sessions (unassigned sessions)
  const clients = await db
    .select({
      id: ClientTable.id,
      firstName: ClientTable.firstName,
      middleName: ClientTable.middleName,
      lastName: ClientTable.lastName,
      phoneNumber: ClientTable.phoneNumber,
    })
    .from(ClientTable)
    .innerJoin(SessionTable, eq(ClientTable.id, SessionTable.clientId))
    .where(and(eq(ClientTable.branchId, branchId), eq(SessionTable.status, 'CANCELLED')))
    .groupBy(
      ClientTable.id,
      ClientTable.firstName,
      ClientTable.middleName,
      ClientTable.lastName,
      ClientTable.phoneNumber
    );

  return clients.map((client) => ({
    ...client,
    name: `${client.firstName} ${client.middleName ? client.middleName + ' ' : ''}${client.lastName}`,
  }));
};

export const getClientsWithUnassignedSessions = async () => {
  const { userId } = await auth();
  const { id: branchId } = await getBranchConfig();

  if (!userId || !branchId) {
    return [];
  }

  return await _getClientsWithUnassignedSessions(branchId);
};

const _getAdmissionStatistics = async (branchId: string, months: number = 6) => {
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

export const getAdmissionStatistics = async (months: number = 6) => {
  const { id: branchId } = await getBranchConfig();

  return await _getAdmissionStatistics(branchId, months);
};

export type Client = Awaited<ReturnType<typeof getClients>>[0];
export type ClientDetail = Awaited<ReturnType<typeof getClient>>;
export type ClientWithUnassignedSessions = Awaited<
  ReturnType<typeof getClientsWithUnassignedSessions>
>[0];
export type AdmissionStatistics = Awaited<ReturnType<typeof getAdmissionStatistics>>;

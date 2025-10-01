import { db } from '@/db';
import { ClientTable, SessionTable, LearningLicenseTable } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, ilike, and, desc, or, count, gte, sql } from 'drizzle-orm';
import { getBranchConfig } from './branch';

const _getClients = async (branchId: string, name?: string, needsLearningTest?: boolean) => {
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

  const clients = await db.query.ClientTable.findMany({
    where: and(...conditions),
    orderBy: desc(ClientTable.createdAt),
    columns: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      phoneNumber: true,
      clientCode: true,
      serviceType: true,
      createdAt: true,
    },
    with: {
      sessions: true,
      learningLicense: true,
      drivingLicense: true,
      plan: true,
    },
  });

  return clients.map((client) => ({
    ...client,
    hasPlan: client.plan.length > 0,
  }));
};

export const getClients = async (name?: string, needsLearningTest?: boolean) => {
  const { userId } = await auth();
  const { id: branchId } = await getBranchConfig();

  if (!userId || !branchId) {
    return [];
  }

  return await _getClients(branchId, name, needsLearningTest);
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
export type ClientDetail = Awaited<ReturnType<typeof getClients>>;
export type ClientWithUnassignedSessions = Awaited<
  ReturnType<typeof getClientsWithUnassignedSessions>
>[0];
export type AdmissionStatistics = Awaited<ReturnType<typeof getAdmissionStatistics>>;

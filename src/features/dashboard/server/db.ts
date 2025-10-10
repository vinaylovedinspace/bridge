import { db } from '@/db';
import {
  ClientTable,
  FullPaymentTable,
  InstallmentPaymentTable,
  LearningLicenseTable,
  PaymentTable,
  PlanTable,
  RTOServicesTable,
  SessionTable,
  StaffTable,
} from '@/db/schema';
import { and, count, countDistinct, eq, gte, inArray, isNull, or, sql } from 'drizzle-orm';
import { formatDateToYYYYMMDD } from '@/lib/date-time-utils';

const MONTH_NAMES_SHORT = [
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
] as const;

const MONTH_NAMES_FULL = [
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
] as const;

const LEARNING_LICENSE_MIN_DAYS = 30;
const DEFAULT_MONTHS_RANGE = 6;

const RTO_PENDING_STATUSES = [
  'PENDING',
  'DOCUMENT_COLLECTION',
  'APPLICATION_SUBMITTED',
  'UNDER_REVIEW',
] as const;

/**
 * Formats a date to YYYY-MM format
 */
const formatMonthKey = (date: Date): string => {
  return date.toISOString().slice(0, 7);
};

type MonthStatistic = {
  month: string;
  users: number;
  fullMonth: string;
};

/**
 * Generates month data for the specified range
 * Pre-allocates array and uses Map for O(1) lookups
 */
const generateMonthsData = (
  months: number,
  dbResults: Array<{ month: string; count: number }>
): MonthStatistic[] => {
  const resultsMap = new Map(dbResults.map((r) => [r.month, Number(r.count)]));
  const monthsData: MonthStatistic[] = new Array(months);

  const now = new Date();
  for (let i = 0; i < months; i++) {
    const date = new Date(now);
    date.setMonth(now.getMonth() - (months - 1 - i));

    const monthKey = formatMonthKey(date);
    const monthIndex = date.getMonth();

    monthsData[i] = {
      month: MONTH_NAMES_SHORT[monthIndex],
      users: resultsMap.get(monthKey) ?? 0,
      fullMonth: MONTH_NAMES_FULL[monthIndex],
    };
  }

  return monthsData;
};

const validateMonths = (months: number): void => {
  if (!Number.isInteger(months) || months < 1 || months > 24) {
    throw new Error('Invalid months: must be an integer between 1 and 24');
  }
};

/**
 * Calculates the start date for a given number of months ago
 */
const getDateMonthsAgo = (months: number): Date => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  date.setHours(0, 0, 0, 0);
  return date;
};

const _getAdmissionStatistics = async (
  branchId: string,
  months: number = DEFAULT_MONTHS_RANGE
): Promise<MonthStatistic[]> => {
  validateMonths(months);

  try {
    const fromDate = getDateMonthsAgo(months);

    const result = await db
      .select({
        month: sql<string>`TO_CHAR(${ClientTable.createdAt}, 'YYYY-MM')`.as('month'),
        count: count(ClientTable.id).as('count'),
      })
      .from(ClientTable)
      .where(and(eq(ClientTable.branchId, branchId), gte(ClientTable.createdAt, fromDate)))
      .groupBy(sql`TO_CHAR(${ClientTable.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${ClientTable.createdAt}, 'YYYY-MM')`);

    return generateMonthsData(months, result);
  } catch (error) {
    console.error('Error fetching admission statistics:', error);
    throw new Error('Failed to retrieve admission statistics');
  }
};

export const getAdmissionStatistics = async (branchId: string, months: number) => {
  // const cacheFn = dbCache(_getAdmissionStatistics, {
  //   tags: [getIdTag(branchId, CACHE_TAGS.dashboard_admissionOverview)],
  // });

  return _getAdmissionStatistics(branchId, months);
};

type LicenceWorkCount = {
  learningTestCount: number;
  finalTestCount: number;
  rtoWorkCount: number;
};

const _getLicenceWorkCount = async (branchId: string): Promise<LicenceWorkCount> => {
  try {
    // Execute all three queries in parallel for maximum performance
    const [learningTestCountResult, finalTestCountResult, rtoWorkCountResult] = await Promise.all([
      // Learning Test Count: Clients with FULL_SERVICE plans without a learning license
      db
        .select({ count: countDistinct(ClientTable.id) })
        .from(ClientTable)
        .innerJoin(PlanTable, eq(ClientTable.id, PlanTable.clientId))
        .leftJoin(LearningLicenseTable, eq(ClientTable.id, LearningLicenseTable.clientId))
        .where(
          and(
            eq(ClientTable.branchId, branchId),
            eq(PlanTable.serviceType, 'FULL_SERVICE'),
            or(
              isNull(LearningLicenseTable.licenseNumber),
              eq(LearningLicenseTable.licenseNumber, '')
            )
          )
        ),

      // Final Test Count: Clients with FULL_SERVICE plans who received their learning license 30+ days ago
      db
        .select({ count: countDistinct(ClientTable.id) })
        .from(ClientTable)
        .innerJoin(PlanTable, eq(ClientTable.id, PlanTable.clientId))
        .innerJoin(LearningLicenseTable, eq(ClientTable.id, LearningLicenseTable.clientId))
        .where(
          and(
            eq(ClientTable.branchId, branchId),
            eq(PlanTable.serviceType, 'FULL_SERVICE'),
            sql`${LearningLicenseTable.issueDate} IS NOT NULL`,
            sql`CURRENT_DATE - CAST(${LearningLicenseTable.issueDate} AS DATE) >= ${LEARNING_LICENSE_MIN_DAYS}`
          )
        ),

      // RTO Work Count: Count of pending/in-progress RTO services
      db
        .select({ count: countDistinct(RTOServicesTable.id) })
        .from(RTOServicesTable)
        .where(
          and(
            eq(RTOServicesTable.branchId, branchId),
            inArray(RTOServicesTable.status, [...RTO_PENDING_STATUSES])
          )
        ),
    ]);

    return {
      learningTestCount: Number(learningTestCountResult[0]?.count ?? 0),
      finalTestCount: Number(finalTestCountResult[0]?.count ?? 0),
      rtoWorkCount: Number(rtoWorkCountResult[0]?.count ?? 0),
    };
  } catch (error) {
    console.error('Error fetching licence work count:', error);
    throw new Error('Failed to retrieve licence work count');
  }
};

export const getLicenceWorkCount = async (branchId: string) => {
  // const cacheFn = dbCache(_getLicenceWorkCount, {
  //   tags: [getIdTag(branchId, CACHE_TAGS.dashboard_licenceWorkCount)],
  // });

  return _getLicenceWorkCount(branchId);
};

const _getOverduePaymentsCount = async (branchId: string): Promise<number> => {
  try {
    // Execute both counts in parallel
    const [planOverdueResult, rtoOverdueResult] = await Promise.all([
      // Count overdue plan payments using pure SQL
      db.execute(sql`
        WITH plan_overdue AS (
          -- Plans without any payment
          SELECT p.id
          FROM ${PlanTable} p
          WHERE p.branch_id = ${branchId}
            AND p.payment_id IS NULL
          
          UNION
          
          -- Plans with FULL_PAYMENT type where payment is not paid
          SELECT p.id
          FROM ${PlanTable} p
          INNER JOIN ${PaymentTable} pay ON p.payment_id = pay.id
          LEFT JOIN ${FullPaymentTable} fp ON pay.id = fp.payment_id
          WHERE p.branch_id = ${branchId}
            AND pay.payment_type = 'FULL_PAYMENT'
            AND pay.payment_status != 'FULLY_PAID'
            AND (fp.is_paid IS NULL OR fp.is_paid = false)
          
          UNION
          
          -- Plans with INSTALLMENTS where first installment is unpaid
          SELECT p.id
          FROM ${PlanTable} p
          INNER JOIN ${PaymentTable} pay ON p.payment_id = pay.id
          LEFT JOIN ${InstallmentPaymentTable} ip ON pay.id = ip.payment_id AND ip.installment_number = 1
          WHERE p.branch_id = ${branchId}
            AND pay.payment_type = 'INSTALLMENTS'
            AND pay.payment_status != 'FULLY_PAID'
            AND (ip.is_paid IS NULL OR ip.is_paid = false)
          
          UNION
          
          -- Plans with INSTALLMENTS where 1st is paid but 2nd is due and unpaid
          SELECT p.id
          FROM ${PlanTable} p
          INNER JOIN ${PaymentTable} pay ON p.payment_id = pay.id
          LEFT JOIN ${InstallmentPaymentTable} ip1 ON pay.id = ip1.payment_id AND ip1.installment_number = 1
          LEFT JOIN ${InstallmentPaymentTable} ip2 ON pay.id = ip2.payment_id AND ip2.installment_number = 2
          WHERE p.branch_id = ${branchId}
            AND pay.payment_type = 'INSTALLMENTS'
            AND pay.payment_status != 'FULLY_PAID'
            AND p.joining_date IS NOT NULL
            AND ip1.is_paid = true
            AND CURRENT_DATE >= CAST(p.joining_date AS DATE) + INTERVAL '1 month'
            AND (ip2.is_paid IS NULL OR ip2.is_paid = false)
        )
        SELECT COUNT(*) as count FROM plan_overdue
      `),

      // Count overdue RTO service payments
      db
        .select({ count: count() })
        .from(RTOServicesTable)
        .leftJoin(PaymentTable, eq(RTOServicesTable.paymentId, PaymentTable.id))
        .where(
          and(
            eq(RTOServicesTable.branchId, branchId),
            or(
              isNull(RTOServicesTable.paymentId),
              sql`${PaymentTable.paymentStatus} != 'FULLY_PAID'`
            )
          )
        ),
    ]);

    const planCount = Number(planOverdueResult.rows[0]?.count ?? 0);
    const rtoCount = Number(rtoOverdueResult[0]?.count ?? 0);
    return planCount + rtoCount;
  } catch (error) {
    console.error('Error fetching overdue payments count:', error);
    throw new Error('Failed to retrieve overdue payments count');
  }
};

export const getOverduePaymentsCount = async (branchId: string) => {
  // const cacheFn = dbCache(_getOverduePaymentsCount, {
  //   tags: [getIdTag(branchId, CACHE_TAGS.dashboard_pendingPayments)],
  // });

  return _getOverduePaymentsCount(branchId);
};

const getTodayString = (): string => {
  return formatDateToYYYYMMDD(new Date());
};

type InstructorStatusCount = {
  active: number;
  inactive: number;
  total: number;
};

export const getInstructorStatusCount = async (
  branchId: string
): Promise<InstructorStatusCount> => {
  try {
    const today = getTodayString();

    // Execute both count queries in parallel for maximum performance
    const [totalCountResult, activeCountResult] = await Promise.all([
      // Get total count of active instructors
      db
        .select({ count: count() })
        .from(StaffTable)
        .where(
          and(
            eq(StaffTable.branchId, branchId),
            eq(StaffTable.staffRole, 'instructor'),
            isNull(StaffTable.deletedAt)
          )
        ),

      // Count instructors with IN_PROGRESS sessions today
      db
        .select({ count: countDistinct(StaffTable.id) })
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
        ),
    ]);

    const totalInstructors = Number(totalCountResult[0]?.count ?? 0);
    const activeCount = Number(activeCountResult[0]?.count ?? 0);
    const inactiveCount = Math.max(0, totalInstructors - activeCount);

    return {
      active: activeCount,
      inactive: inactiveCount,
      total: totalInstructors,
    };
  } catch (error) {
    console.error('Error fetching instructor status count:', error);
    throw new Error('Failed to retrieve instructor status count');
  }
};

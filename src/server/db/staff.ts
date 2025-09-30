import { db } from '@/db';
import { StaffTable, StaffRoleEnum, SessionTable } from '@/db/schema';
import { eq, ilike, and, desc, or, isNull, count } from 'drizzle-orm';
import { getBranchConfig } from './branch';

const _getStaff = async (branchId: string, name?: string, role?: string | 'ALL') => {
  const conditions = [eq(StaffTable.branchId, branchId), isNull(StaffTable.deletedAt)];

  if (name) {
    conditions.push(
      or(ilike(StaffTable.firstName, `%${name}%`), ilike(StaffTable.lastName, `%${name}%`))!
    );
  }

  if (role && role !== 'ALL') {
    conditions.push(eq(StaffTable.staffRole, role as (typeof StaffRoleEnum.enumValues)[number]));
  }

  const staff = await db.query.StaffTable.findMany({
    where: and(...conditions),
    with: {
      assignedVehicle: {
        columns: {
          name: true,
          number: true,
        },
      },
    },
    orderBy: [desc(StaffTable.createdAt)],
  });

  return staff;
};

export const getStaff = async (name?: string, role?: string | 'ALL') => {
  const { id: branchId } = await getBranchConfig();

  return await _getStaff(branchId, name, role);
};

const _getStaffMember = async (id: string, branchId: string) => {
  const staff = await db.query.StaffTable.findFirst({
    where: and(
      eq(StaffTable.id, id),
      eq(StaffTable.branchId, branchId),
      isNull(StaffTable.deletedAt)
    ),
    with: {
      assignedVehicle: true,
    },
  });

  return staff;
};

export const getStaffMember = async (id: string) => {
  const { id: branchId } = await getBranchConfig();

  return await _getStaffMember(id, branchId);
};

const _getInstructorStatusCount = async (branchId: string) => {
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

export const getInstructorStatusCount = async () => {
  const { id: branchId } = await getBranchConfig();

  return await _getInstructorStatusCount(branchId);
};

export type Staff = Awaited<ReturnType<typeof getStaff>>[0];
export type StaffDetail = Awaited<ReturnType<typeof getStaffMember>>;
export type InstructorStatusCount = Awaited<ReturnType<typeof getInstructorStatusCount>>;

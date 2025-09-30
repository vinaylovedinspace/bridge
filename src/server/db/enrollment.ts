import { db } from '@/db';
import { ClientTable, PaymentTable, PlanTable } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, desc } from 'drizzle-orm';
import { getBranchConfig } from './branch';

const _getEnrollments = async (branchId: string) => {
  const enrollments = await db
    .select({
      planId: PlanTable.id,
      planCode: PlanTable.planCode,
      clientId: ClientTable.id,
      clientCode: ClientTable.clientCode,
      firstName: ClientTable.firstName,
      middleName: ClientTable.middleName,
      lastName: ClientTable.lastName,
      phoneNumber: ClientTable.phoneNumber,
      planStatus: PlanTable.status,
      paymentStatus: PaymentTable.paymentStatus,
      createdAt: PlanTable.createdAt,
    })
    .from(PlanTable)
    .innerJoin(ClientTable, eq(PlanTable.clientId, ClientTable.id))
    .leftJoin(PaymentTable, eq(PlanTable.paymentId, PaymentTable.id))
    .where(eq(ClientTable.branchId, branchId))
    .orderBy(desc(PlanTable.createdAt));

  return enrollments;
};

export const getEnrollments = async () => {
  const { userId } = await auth();
  const { id: branchId } = await getBranchConfig();

  if (!userId || !branchId) {
    return [];
  }

  return await _getEnrollments(branchId);
};

export type Enrollment = Awaited<ReturnType<typeof getEnrollments>>[0];

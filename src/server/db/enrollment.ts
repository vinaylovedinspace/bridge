import { db } from '@/db';
import { ClientTable, PlanTable } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, desc } from 'drizzle-orm';
import { getBranchConfig } from './branch';

const _getEnrollments = async (branchId: string) => {
  const enrollments = await db.query.PlanTable.findMany({
    columns: {
      id: true,
      planCode: true,
      status: true,
      createdAt: true,
    },
    with: {
      client: {
        columns: {
          id: true,
          clientCode: true,
          firstName: true,
          middleName: true,
          lastName: true,
          phoneNumber: true,
        },
      },
      payment: {
        columns: {
          id: true,
          paymentStatus: true,
        },
      },
    },
    where: eq(ClientTable.branchId, branchId),
    orderBy: desc(PlanTable.createdAt),
  });
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

export type Enrollments = Awaited<ReturnType<typeof getEnrollments>>;

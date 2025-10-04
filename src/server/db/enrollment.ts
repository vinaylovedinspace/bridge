import { db } from '@/db';
import { PlanTable } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, desc } from 'drizzle-orm';
import { getBranchConfig } from './branch';
import { isPaymentOverdue } from '@/lib/payment/is-payment-overdue';

const _getEnrollments = async (branchId: string, paymentStatus?: string) => {
  const enrollments = await db.query.PlanTable.findMany({
    columns: {
      id: true,
      planCode: true,
      status: true,
      createdAt: true,
      joiningDate: true,
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
          paymentType: true,
        },
        with: {
          installmentPayments: true,
          fullPayment: true,
        },
      },
    },
    where: eq(PlanTable.branchId, branchId),
    orderBy: desc(PlanTable.createdAt),
  });

  // Filter by payment status if OVERDUE is specified
  if (paymentStatus === 'OVERDUE') {
    return enrollments.filter((plan) => {
      // If no payment entry, consider it overdue
      if (!plan.payment) return true;

      return isPaymentOverdue(plan.payment, plan);
    });
  }

  return enrollments;
};

export const getEnrollments = async (paymentStatus?: string) => {
  const { userId } = await auth();
  const { id: branchId } = await getBranchConfig();

  if (!userId || !branchId) {
    return [];
  }

  return await _getEnrollments(branchId, paymentStatus);
};

export type Enrollments = Awaited<ReturnType<typeof getEnrollments>>;

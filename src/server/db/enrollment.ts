import { db } from '@/db';
import { PlanTable, ClientTable } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, desc, and, or, ilike } from 'drizzle-orm';
import { getBranchConfig } from '@/server/actions/branch';
import { isPaymentOverdue } from '@/lib/payment/is-payment-overdue';

const _getEnrollments = async (branchId: string, search?: string, paymentStatus?: string) => {
  const conditions = [eq(PlanTable.branchId, branchId)];

  if (search) {
    // Get client IDs that match the search
    const matchingClients = await db
      .select({ id: ClientTable.id })
      .from(ClientTable)
      .where(
        and(
          eq(ClientTable.branchId, branchId),
          or(
            ilike(ClientTable.firstName, `%${search}%`),
            ilike(ClientTable.lastName, `%${search}%`),
            ilike(ClientTable.phoneNumber, `%${search}%`),
            ilike(ClientTable.aadhaarNumber, `%${search}%`)
          )
        )
      );

    const clientIds = matchingClients.map((c) => c.id);

    // Filter plans by matching client IDs
    if (clientIds.length > 0) {
      conditions.push(or(...clientIds.map((id) => eq(PlanTable.clientId, id)))!);
    } else {
      // If no clients match, return empty array
      return [];
    }
  }
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
    where: and(...conditions),
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

export const getEnrollments = async (search?: string, paymentStatus?: string) => {
  const { userId } = await auth();
  const { id: branchId } = await getBranchConfig();

  if (!userId || !branchId) {
    return [];
  }

  return await _getEnrollments(branchId, search, paymentStatus);
};

export type Enrollments = Awaited<ReturnType<typeof getEnrollments>>;

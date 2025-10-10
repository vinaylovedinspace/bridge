import { db } from '@/db';
import { ClientTable, PaymentTable, FullPaymentTable } from '@/db/schema';
import { eq, and, desc, or, ilike } from 'drizzle-orm';
import { getBranchConfig } from './branch';
import { PaymentStatus } from '@/db/schema/payment/columns';

const _getPayments = async (branchId: string, name?: string, paymentStatus?: PaymentStatus) => {
  const conditions = [eq(PaymentTable.branchId, branchId)];

  if (name) {
    conditions.push(
      or(ilike(ClientTable.firstName, `%${name}%`), ilike(ClientTable.lastName, `%${name}%`))!
    );
  }

  if (paymentStatus) {
    conditions.push(eq(PaymentTable.paymentStatus, paymentStatus));
  }

  // Get all payments with client information and latest transaction details
  const payments = await db.query.PaymentTable.findMany({
    where: and(...conditions),
    orderBy: desc(PaymentTable.createdAt),
    with: {
      client: true,
      fullPayment: true,
      installmentPayments: true,
      plan: true,
      rtoService: true,
    },
  });

  return payments;
};

export const getPayments = async (name?: string, paymentStatus?: PaymentStatus) => {
  const { id: branchId } = await getBranchConfig();

  return await _getPayments(branchId, name, paymentStatus);
};

export type Payment = Awaited<ReturnType<typeof getPayments>>[0];

export const upsertFullPaymentInDB = async (data: typeof FullPaymentTable.$inferInsert) => {
  return await db.transaction(async (tx) => {
    // Check if full payment already exists
    const existingFullPayment = await tx.query.FullPaymentTable.findFirst({
      where: eq(FullPaymentTable.paymentId, data.paymentId),
    });

    // Update existing payment record
    if (existingFullPayment) {
      const [updated] = await tx
        .update(FullPaymentTable)
        .set({
          paymentMode: data.paymentMode,
          paymentDate: data.paymentDate,
          isPaid: data.isPaid,
        })
        .where(eq(FullPaymentTable.paymentId, data.paymentId))
        .returning();

      return updated;
    }

    // Create new full payment and update status
    const [payment] = await tx.insert(FullPaymentTable).values(data).returning();

    await tx
      .update(PaymentTable)
      .set({
        paymentStatus: 'FULLY_PAID',
        updatedAt: new Date(),
      })
      .where(eq(PaymentTable.id, data.paymentId));

    return payment;
  });
};

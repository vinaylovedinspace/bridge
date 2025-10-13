import { db } from '@/db';
import { ClientTable, PaymentTable, FullPaymentTable } from '@/db/schema';
import { eq, and, desc, or, ilike } from 'drizzle-orm';
import { getBranchConfig } from '@/server/action/branch';
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
    await tx
      .insert(FullPaymentTable)
      .values(data)
      .onConflictDoUpdate({
        target: FullPaymentTable.paymentId,
        set: {
          paymentMode: data.paymentMode,
          paymentDate: data.paymentDate,
          isPaid: data.isPaid,
        },
      })
      .returning();

    const updatedPayment = await tx
      .update(PaymentTable)
      .set({
        paymentStatus: 'FULLY_PAID',
        updatedAt: new Date(),
      })
      .where(eq(PaymentTable.id, data.paymentId))
      .returning();

    return updatedPayment;
  });
};

export const upsertPaymentInDB = async (data: typeof PaymentTable.$inferInsert) => {
  if (data.id) {
    const [updated] = await db
      .update(PaymentTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(PaymentTable.id, data.id))
      .returning();

    return updated;
  }

  const [created] = await db.insert(PaymentTable).values(data).returning();

  return created;
};

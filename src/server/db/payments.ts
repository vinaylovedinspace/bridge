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

    const [updatedPayment] = await tx
      .update(PaymentTable)
      .set({
        paymentStatus: 'FULLY_PAID',
        updatedAt: new Date(),
      })
      .where(eq(PaymentTable.id, data.paymentId))
      .returning();

    // Send payment receipt after successful payment processing
    try {
      await sendPaymentReceiptAfterPayment(updatedPayment.id, data.paymentMode || 'CASH');
    } catch (error) {
      console.error('❌ [Payment Receipt] Failed to send payment receipt:', error);
    }

    return updatedPayment;
  });
};

// Helper function to send payment receipt after successful payment
async function sendPaymentReceiptAfterPayment(paymentId: string, paymentMode: string) {
  console.log('📱 [Payment Receipt] Sending payment receipt for payment:', paymentId);

  try {
    // Get payment with client information
    const payment = await db.query.PaymentTable.findFirst({
      where: eq(PaymentTable.id, paymentId),
      with: {
        client: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (!payment || !payment.client) {
      console.log('❌ [Payment Receipt] Payment or client not found');
      return;
    }

    // Import payment service dynamically to avoid circular dependencies
    const { sendPaymentReceipt } = await import('@/lib/whatsapp/services/payment-service');

    const paymentReceiptResult = await sendPaymentReceipt(payment.client, {
      amount: payment.totalAmount,
      date: new Date(),
      type: payment.paymentType === 'INSTALLMENTS' ? 'installment' : 'full',
      paymentMode: paymentMode,
      transactionReference: `PAY-${payment.id}`,
      totalAmount: payment.totalAmount,
      remainingAmount: 0,
      installmentNumber: 1,
    });

    console.log('📱 [Payment Receipt] Payment receipt result:', paymentReceiptResult);
  } catch (error) {
    console.error('❌ [Payment Receipt] Error sending payment receipt:', error);
  }
}

export const upsertPaymentInDB = async (data: typeof PaymentTable.$inferInsert) => {
  if (data.id) {
    // Fetch current payment to check if it's already paid
    const currentPayment = await db.query.PaymentTable.findFirst({
      where: eq(PaymentTable.id, data.id),
    });

    // Don't overwrite paymentStatus if it's already FULLY_PAID or PARTIALLY_PAID
    const shouldPreserveStatus =
      currentPayment?.paymentStatus === 'FULLY_PAID' ||
      currentPayment?.paymentStatus === 'PARTIALLY_PAID';

    const updateData = shouldPreserveStatus
      ? { ...data, paymentStatus: currentPayment.paymentStatus, updatedAt: new Date() }
      : { ...data, updatedAt: new Date() };

    const [updated] = await db
      .update(PaymentTable)
      .set(updateData)
      .where(eq(PaymentTable.id, data.id))
      .returning();

    return updated;
  }

  const [created] = await db.insert(PaymentTable).values(data).returning();

  return created;
};

import { db } from '@/db';
import { ClientTable, PaymentTable, TransactionTable, PlanTable } from '@/db/schema';
import { eq, and, desc, max, or, ilike } from 'drizzle-orm';
import { getBranchConfig } from './branch';
import { isPaymentOverdue } from '@/lib/payment/is-payment-overdue';

const _getPayments = async (branchId: string, name?: string, paymentStatus?: string) => {
  const conditions = [eq(ClientTable.branchId, branchId)];

  if (name) {
    conditions.push(
      or(ilike(ClientTable.firstName, `%${name}%`), ilike(ClientTable.lastName, `%${name}%`))!
    );
  }

  // Get all payments with client information and latest transaction details
  const payments = await db
    .select({
      id: PaymentTable.id,
      clientId: PaymentTable.clientId,
      clientFirstName: ClientTable.firstName,
      clientMiddleName: ClientTable.middleName,
      clientLastName: ClientTable.lastName,
      clientCode: ClientTable.clientCode,
      originalAmount: PaymentTable.originalAmount,
      finalAmount: PaymentTable.finalAmount,
      discount: PaymentTable.discount,
      paymentStatus: PaymentTable.paymentStatus,
      paymentType: PaymentTable.paymentType,
      licenseServiceFee: PaymentTable.licenseServiceFee,
      createdAt: PaymentTable.createdAt,
    })
    .from(PaymentTable)
    .innerJoin(ClientTable, eq(PaymentTable.clientId, ClientTable.id))
    .where(and(...conditions))
    .orderBy(desc(PaymentTable.createdAt));

  // Get latest transaction for each payment to determine last payment date
  const paymentsWithTransactions = await Promise.all(
    payments.map(async (payment) => {
      const latestTransaction = await db
        .select({
          createdAt: max(TransactionTable.createdAt),
        })
        .from(TransactionTable)
        .where(
          and(
            eq(TransactionTable.paymentId, payment.id),
            eq(TransactionTable.transactionStatus, 'SUCCESS')
          )
        );

      // TODO: Reimplement amount due calculation with new schema
      const amountDue = payment.finalAmount;
      const nextInstallmentDate: Date | null = null;
      const isOverdue = false;

      // Determine payment status based on current state
      let displayStatus: 'PENDING' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERDUE' =
        payment.paymentStatus || 'PENDING';
      if (isOverdue && amountDue > 0) {
        displayStatus = 'OVERDUE';
      } else if (amountDue === 0) {
        displayStatus = 'FULLY_PAID';
      }

      return {
        id: payment.id,
        clientId: payment.clientId,
        clientName: `${payment.clientFirstName} ${payment.clientMiddleName ? payment.clientMiddleName + ' ' : ''}${payment.clientLastName}`,
        amountDue,
        totalFees: payment.finalAmount,
        nextInstallmentDate,
        paymentStatus: displayStatus,
        lastPaymentDate: latestTransaction[0]?.createdAt
          ? new Date(latestTransaction[0].createdAt)
          : null,
        clientCode: payment.clientCode,
      };
    })
  );

  // Filter by payment status if provided
  if (paymentStatus && paymentStatus !== 'ALL') {
    return paymentsWithTransactions.filter((payment) => {
      if (paymentStatus === 'PENDING') {
        return payment.paymentStatus === 'PENDING';
      } else if (paymentStatus === 'PARTIALLY_PAID') {
        return payment.paymentStatus === 'PARTIALLY_PAID';
      } else if (paymentStatus === 'FULLY_PAID') {
        return payment.paymentStatus === 'FULLY_PAID';
      } else if (paymentStatus === 'OVERDUE') {
        return payment.paymentStatus === 'OVERDUE';
      }
      return true;
    });
  }

  return paymentsWithTransactions;
};

export const getPayments = async (name?: string, paymentStatus?: string) => {
  const { id: branchId } = await getBranchConfig();

  return await _getPayments(branchId, name, paymentStatus);
};

const _getOverduePaymentsCount = async (branchId: string) => {
  const conditions = [eq(PlanTable.branchId, branchId)];

  const plans = await db.query.PlanTable.findMany({
    where: and(...conditions),
    with: {
      payment: {
        with: {
          client: true,
          installmentPayments: true,
          fullPayment: true,
        },
      },
    },
  });

  const overdueCount = plans.filter((plan) => {
    // If no payment entry, consider it overdue
    if (!plan.payment) return true;

    return isPaymentOverdue(plan.payment, plan);
  }).length;

  return overdueCount;
};

export const getOverduePaymentsCount = async () => {
  const { id: branchId } = await getBranchConfig();

  return await _getOverduePaymentsCount(branchId);
};

export type Payment = Awaited<ReturnType<typeof getPayments>>[0];

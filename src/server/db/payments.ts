import { db } from '@/db';
import {
  ClientTable,
  PaymentTable,
  TransactionTable,
  FullPaymentTable,
  InstallmentPaymentTable,
  PlanTable,
} from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, and, desc, max, or, ilike, isNull, sum } from 'drizzle-orm';
import { getCurrentOrganizationBranchId } from '@/server/db/branch';
import { format, isBefore, parseISO } from 'date-fns';

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
  const { userId } = await auth();
  const branchId = await getCurrentOrganizationBranchId();

  if (!userId || !branchId) {
    return [];
  }

  return await _getPayments(branchId, name, paymentStatus);
};

const _getOverduePaymentsCount = async (branchId: string) => {
  const conditions = [eq(ClientTable.branchId, branchId)];

  const payments = await db
    .select({
      id: PaymentTable.id,
      paymentStatus: PaymentTable.paymentStatus,
      paymentType: PaymentTable.paymentType,
      finalAmount: PaymentTable.finalAmount,
      joiningDate: PlanTable.joiningDate,
    })
    .from(PaymentTable)
    .innerJoin(ClientTable, eq(PaymentTable.clientId, ClientTable.id))
    .innerJoin(PlanTable, eq(PaymentTable.planId, PlanTable.id))
    .where(and(...conditions));

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  let overdueCount = 0;

  for (const payment of payments) {
    if (payment.paymentStatus === 'FULLY_PAID') {
      continue;
    }

    // Calculate total paid amount from successful transactions
    const totalPaidResult = await db
      .select({
        totalPaid: sum(TransactionTable.amount),
      })
      .from(TransactionTable)
      .where(
        and(
          eq(TransactionTable.paymentId, payment.id),
          eq(TransactionTable.transactionStatus, 'SUCCESS')
        )
      );

    const totalPaid = Number(totalPaidResult[0]?.totalPaid) || 0;
    const amountDue = payment.finalAmount - totalPaid;

    if (amountDue <= 0) {
      continue; // Fully paid
    }

    if (payment.paymentType === 'FULL_PAYMENT') {
      overdueCount++;
    } else if (payment.paymentType === 'INSTALLMENTS') {
      // For installments, check unpaid installments that are overdue
      const installments = await db
        .select({
          installmentNumber: InstallmentPaymentTable.installmentNumber,
          amount: InstallmentPaymentTable.amount,
          isPaid: InstallmentPaymentTable.isPaid,
          paymentDate: InstallmentPaymentTable.paymentDate,
        })
        .from(InstallmentPaymentTable)
        .where(eq(InstallmentPaymentTable.paymentId, payment.id));

      let hasOverdueInstallment = false;
      for (const installment of installments) {
        if (!installment.isPaid && installment.paymentDate && installment.paymentDate < todayStr) {
          hasOverdueInstallment = true;
          break;
        }
      }

      if (hasOverdueInstallment) {
        overdueCount++;
      }
    }
  }

  return overdueCount;
};

export const getOverduePaymentsCount = async () => {
  const { userId } = await auth();
  const branchId = await getCurrentOrganizationBranchId();

  if (!userId || !branchId) {
    return 0;
  }

  return await _getOverduePaymentsCount(branchId);
};

export type Payment = Awaited<ReturnType<typeof getPayments>>[0];

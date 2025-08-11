import { db } from '@/db';
import { ClientTable, PaymentTable, TransactionTable } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, and, desc, max, or, ilike } from 'drizzle-orm';
import { getCurrentOrganizationBranchId } from '@/server/db/branch';

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
      firstInstallmentDate: PaymentTable.firstInstallmentDate,
      firstInstallmentPaid: PaymentTable.firstInstallmentPaid,
      secondInstallmentDate: PaymentTable.secondInstallmentDate,
      secondInstallmentPaid: PaymentTable.secondInstallmentPaid,
      paymentDueDate: PaymentTable.paymentDueDate,
      fullPaymentDate: PaymentTable.fullPaymentDate,
      fullPaymentPaid: PaymentTable.fullPaymentPaid,
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

      // Calculate amount due based on payment type and status
      let amountDue = 0;
      let nextInstallmentDate: Date | null = null;
      let isOverdue = false;

      if (payment.paymentType === 'FULL_PAYMENT') {
        amountDue = payment.fullPaymentPaid ? 0 : payment.finalAmount;
        if (payment.fullPaymentDate && !payment.fullPaymentPaid) {
          nextInstallmentDate = new Date(payment.fullPaymentDate);
          isOverdue = new Date() > nextInstallmentDate;
        }
      } else if (payment.paymentType === 'INSTALLMENTS') {
        if (!payment.firstInstallmentPaid) {
          amountDue = payment.finalAmount;
          if (payment.firstInstallmentDate) {
            nextInstallmentDate = new Date(payment.firstInstallmentDate);
            isOverdue = new Date() > nextInstallmentDate;
          }
        } else if (!payment.secondInstallmentPaid) {
          amountDue = payment.finalAmount - (payment.originalAmount - payment.finalAmount); // Remaining after first installment
          if (payment.secondInstallmentDate) {
            nextInstallmentDate = new Date(payment.secondInstallmentDate);
            isOverdue = new Date() > nextInstallmentDate;
          }
        } else {
          amountDue = 0;
        }
      } else if (payment.paymentType === 'PAY_LATER') {
        amountDue = payment.finalAmount;
        if (payment.paymentDueDate) {
          nextInstallmentDate = new Date(payment.paymentDueDate);
          isOverdue = new Date() > nextInstallmentDate;
        }
      }

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
      firstInstallmentDate: PaymentTable.firstInstallmentDate,
      firstInstallmentPaid: PaymentTable.firstInstallmentPaid,
      secondInstallmentDate: PaymentTable.secondInstallmentDate,
      secondInstallmentPaid: PaymentTable.secondInstallmentPaid,
      paymentDueDate: PaymentTable.paymentDueDate,
      fullPaymentDate: PaymentTable.fullPaymentDate,
      fullPaymentPaid: PaymentTable.fullPaymentPaid,
    })
    .from(PaymentTable)
    .innerJoin(ClientTable, eq(PaymentTable.clientId, ClientTable.id))
    .where(and(...conditions));

  const today = new Date();
  let overdueCount = 0;

  payments.forEach((payment) => {
    let isOverdue = false;
    let hasAmount = false;

    if (payment.paymentType === 'FULL_PAYMENT') {
      hasAmount = !payment.fullPaymentPaid;
      if (payment.fullPaymentDate && !payment.fullPaymentPaid) {
        isOverdue = today > new Date(payment.fullPaymentDate);
      }
    } else if (payment.paymentType === 'INSTALLMENTS') {
      if (!payment.firstInstallmentPaid) {
        hasAmount = true;
        if (payment.firstInstallmentDate) {
          isOverdue = today > new Date(payment.firstInstallmentDate);
        }
      } else if (!payment.secondInstallmentPaid) {
        hasAmount = true;
        if (payment.secondInstallmentDate) {
          isOverdue = today > new Date(payment.secondInstallmentDate);
        }
      }
    } else if (payment.paymentType === 'PAY_LATER') {
      hasAmount = payment.paymentStatus !== 'FULLY_PAID';
      if (payment.paymentDueDate) {
        isOverdue = today > new Date(payment.paymentDueDate);
      }
    }

    if (isOverdue && hasAmount) {
      overdueCount++;
    }
  });

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

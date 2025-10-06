import { PaymentTable } from '@/db/schema';

type Payment = typeof PaymentTable.$inferSelect;
type PaymentWithRelations = {
  paymentStatus: Payment['paymentStatus'];
  paymentType: Payment['paymentType'];
  fullPayment?: { isPaid: boolean | null } | null;
  installmentPayments: { installmentNumber: number; isPaid: boolean | null }[];
};

type PlanWithJoiningDate = {
  joiningDate: string | null;
};

export const isPaymentOverdue = (
  payment: PaymentWithRelations | null | undefined,
  plan: PlanWithJoiningDate
): boolean => {
  if (!payment) {
    return true;
  }
  if (payment.paymentStatus === 'FULLY_PAID') {
    return false;
  }

  console.log(payment);

  if (payment.paymentType === 'FULL_PAYMENT') {
    // For full payment, check if it's not paid yet
    return payment.fullPayment ? !payment.fullPayment.isPaid : true;
  } else if (payment.paymentType === 'INSTALLMENTS') {
    // Check if 1st installment is unpaid or doesn't exist
    const firstInstallment = payment.installmentPayments.find(
      (inst) => inst.installmentNumber === 1
    );

    if (!firstInstallment || !firstInstallment.isPaid) {
      return true;
    }

    // For 2nd installment, check if it's due after 1 month of joining
    if (!plan.joiningDate) return false;

    const today = new Date();
    const joiningDate = new Date(plan.joiningDate);
    const oneMonthAfterJoining = new Date(joiningDate);
    oneMonthAfterJoining.setMonth(oneMonthAfterJoining.getMonth() + 1);

    // Check if 1 month has passed since joining
    if (today >= oneMonthAfterJoining) {
      // Check if 2nd installment is unpaid
      const secondInstallment = payment.installmentPayments.find(
        (inst) => inst.installmentNumber === 2
      );

      return secondInstallment ? !secondInstallment.isPaid : true;
    }
  }

  return true;
};

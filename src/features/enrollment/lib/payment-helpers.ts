import { formatDateToYYYYMMDD } from '@/lib/date-time-utils';
import { generateSessionsFromPlan } from '@/lib/sessions';
import { getBranchConfig } from '@/server/action/branch';
import { createSessions, getSessionsByClientId } from '@/server/action/sessions';
import {
  createInstallmentPaymentsInDB,
  getExistingInstallmentsInDB,
  getPlanForSessionsInDB,
  getClientForSessionsInDB,
} from '../server/db';
import { upsertFullPaymentInDB } from '@/server/db/payments';
import { PaymentMode } from '@/db/schema';

/**
 * Handle full payment creation
 */
export const handleFullPayment = async (
  paymentId: string,
  paymentMode: PaymentMode
): Promise<void> => {
  const currentDate = formatDateToYYYYMMDD(new Date());

  await upsertFullPaymentInDB({
    paymentId,
    paymentMode,
    paymentDate: currentDate,
    isPaid: true,
  });
};

/**
 * Handle installment payment creation
 */
export const handleInstallmentPayment = async (
  paymentId: string,
  paymentMode: PaymentMode,
  totalAmount: number
): Promise<void> => {
  const currentDate = formatDateToYYYYMMDD(new Date());

  // Check if first installment already exists
  const existingInstallments = await getExistingInstallmentsInDB(paymentId);

  const firstInstallment = existingInstallments.find(
    (installment) => installment.installmentNumber === 1 && installment.isPaid
  );

  if (firstInstallment?.isPaid) {
    // Check if both installments already paid
    const secondInstallmentPaid = existingInstallments.some(
      (installment) => installment.installmentNumber === 2 && installment.isPaid
    );

    if (secondInstallmentPaid) {
      // Both installments already paid, nothing to do
      return;
    }

    const secondInstallmentAmount = Math.ceil(firstInstallment.amount / 2);

    // Create/update second installment
    await createInstallmentPaymentsInDB({
      paymentId,
      installmentNumber: 2,
      amount: secondInstallmentAmount,
      paymentMode,
      paymentDate: currentDate,
      isPaid: true,
    });
  } else {
    const firstInstallmentAmount = Math.ceil(totalAmount / 2);

    // Create first installment
    await createInstallmentPaymentsInDB({
      paymentId,
      installmentNumber: 1,
      amount: firstInstallmentAmount,
      paymentMode,
      paymentDate: currentDate,
      isPaid: true,
    });
  }
};

/**
 * Create fallback sessions if they don't exist
 * Safety net in case createPlan didn't create sessions
 */
export const createFallbackSessions = async (planId: string): Promise<void> => {
  // 1. Fetch plan data
  const plan = await getPlanForSessionsInDB(planId);
  if (!plan) {
    console.warn('[createFallbackSessions] Plan not found:', planId);
    return;
  }

  // 2. Check for existing sessions
  const existingSessions = await getSessionsByClientId(plan.clientId);
  if (existingSessions.length > 0) {
    return;
  }

  // 3. Fetch client and branch config in parallel
  const [client, branchConfig] = await Promise.all([
    getClientForSessionsInDB(plan.clientId),
    getBranchConfig(),
  ]);

  if (!client) {
    return;
  }

  // 4. Generate sessions from plan
  const sessions = generateSessionsFromPlan(
    {
      joiningDate: plan.joiningDate,
      joiningTime: plan.joiningTime,
      numberOfSessions: plan.numberOfSessions,
      vehicleId: plan.vehicleId,
      planId: plan.id,
    },
    {
      firstName: client.firstName,
      lastName: client.lastName,
      id: client.id,
    },
    branchConfig
  );

  // 5. Persist sessions to database
  const result = await createSessions(sessions);

  if (result.error) {
    console.error('[createFallbackSessions] Failed to create sessions:', result.message);
  }
};

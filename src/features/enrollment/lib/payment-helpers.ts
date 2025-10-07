import { dateToString } from '@/lib/date-utils';
import { generateSessionsFromPlan } from '@/lib/sessions';
import { getBranchConfig } from '@/server/db/branch';
import { createSessions, getSessionsByClientId } from '@/server/actions/sessions';
import {
  createFullPaymentInDB,
  createInstallmentPaymentsInDB,
  getExistingInstallmentsInDB,
  getPlanForSessionsInDB,
  getClientForSessionsInDB,
} from '../server/db';

/**
 * Handle full payment creation
 */
export const handleFullPayment = async (
  paymentId: string,
  paymentMode: 'CASH' | 'QR'
): Promise<void> => {
  const currentDate = dateToString(new Date());

  await createFullPaymentInDB({
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
  paymentMode: 'CASH' | 'QR',
  firstInstallmentAmount: number,
  secondInstallmentAmount: number
): Promise<void> => {
  const currentDate = dateToString(new Date());

  // Check if first installment already exists
  const existingInstallments = await getExistingInstallmentsInDB(paymentId);

  const firstInstallmentExists = existingInstallments.some(
    (installment) => installment.installmentNumber === 1 && installment.isPaid
  );

  if (firstInstallmentExists) {
    // Check if both installments already paid
    const secondInstallmentPaid = existingInstallments.some(
      (installment) => installment.installmentNumber === 2 && installment.isPaid
    );

    if (secondInstallmentPaid) {
      // Both installments already paid, nothing to do
      return;
    }

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

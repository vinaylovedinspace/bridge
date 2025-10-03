import { PlanTable, VehicleTable, PaymentTypeEnum } from '@/db/schema';
import { dateToString } from '@/lib/date-utils';
import { calculatePaymentBreakdown } from '@/lib/payment/calculate';
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
 * Calculate payment amounts based on plan and vehicle
 */
export const calculatePaymentAmounts = (
  plan: typeof PlanTable.$inferSelect,
  vehicle: typeof VehicleTable.$inferSelect,
  discount: number,
  paymentType: (typeof PaymentTypeEnum.enumValues)[number]
) => {
  // Validate inputs
  if (plan.numberOfSessions <= 0) {
    throw new Error('Number of sessions must be greater than 0');
  }

  if (plan.sessionDurationInMinutes <= 0) {
    throw new Error('Session duration must be greater than 0');
  }

  if (vehicle.rent < 0) {
    throw new Error('Vehicle rent cannot be negative');
  }

  if (discount < 0) {
    throw new Error('Discount cannot be negative');
  }

  return calculatePaymentBreakdown({
    sessions: plan.numberOfSessions,
    duration: plan.sessionDurationInMinutes,
    rate: vehicle.rent,
    discount,
    paymentType,
  });
};

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
  // Validate installment amounts
  if (firstInstallmentAmount <= 0) {
    throw new Error('First installment amount must be greater than 0');
  }

  if (secondInstallmentAmount <= 0) {
    throw new Error('Second installment amount must be greater than 0');
  }

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
 * This is a safety net in case createPlan didn't create sessions
 */
export const createFallbackSessions = async (planId: string): Promise<void> => {
  const plan = await getPlanForSessionsInDB(planId);

  if (!plan) return;

  // Check if sessions already exist
  const existingSessions = await getSessionsByClientId(plan.clientId);

  if (existingSessions.length > 0) {
    console.log(
      `Sessions already exist for client (${existingSessions.length} sessions), skipping creation in payment step`
    );
    return;
  }

  // Get client details
  const client = await getClientForSessionsInDB(plan.clientId);

  if (!client) return;

  // Get branch config
  const branchConfig = await getBranchConfig();

  // Generate and create sessions
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

  const sessionsResult = await createSessions(sessions);

  if (sessionsResult.error) {
    console.error('Failed to create sessions:', sessionsResult.message);
  } else {
    console.log('Successfully created sessions as fallback:', sessionsResult.message);
  }
};

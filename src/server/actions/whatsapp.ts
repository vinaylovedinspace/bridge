'use server';

import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { ClientTable } from '@/db/schema/client/columns';
import { PlanTable } from '@/db/schema/plan/columns';
import { VehicleTable } from '@/db/schema/vehicles/columns';
import { getSessionsByClientId } from './sessions';
import { sendOnboardingWithReceiptWhatsApp } from '@/lib/whatsapp';

export interface SendOnboardingMessageParams {
  clientId: string;
  planId: string;
  paymentMode: 'CASH' | 'QR' | 'PAYMENT_LINK';
  amount: number;
  transactionReference?: string;
}

export async function sendOnboardingMessageAfterPayment(params: SendOnboardingMessageParams) {
  try {
    console.log('📱 [WhatsApp Action] Starting onboarding message for:', params);

    // Get client details
    const client = await db.query.ClientTable.findFirst({
      where: eq(ClientTable.id, params.clientId),
    });

    if (!client) {
      console.error('❌ [WhatsApp Action] Client not found:', params.clientId);
      return { success: false, error: 'Client not found' };
    }

    console.log('📱 [WhatsApp Action] Client found:', {
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
      phone: client.phoneNumber,
    });

    // Get plan details
    const plan = await db.query.PlanTable.findFirst({
      where: eq(PlanTable.id, params.planId),
    });

    if (!plan) {
      console.error('❌ [WhatsApp Action] Plan not found:', params.planId);
      return { success: false, error: 'Plan not found' };
    }

    console.log('📱 [WhatsApp Action] Plan found:', {
      id: plan.id,
      sessions: plan.numberOfSessions,
      joiningDate: plan.joiningDate,
      joiningTime: plan.joiningTime,
    });

    // Get vehicle details
    const vehicle = await db.query.VehicleTable.findFirst({
      where: eq(VehicleTable.id, plan.vehicleId),
    });

    console.log(
      '📱 [WhatsApp Action] Vehicle found:',
      vehicle
        ? {
            name: vehicle.name,
            number: vehicle.number,
          }
        : 'NOT FOUND'
    );

    // Get sessions
    const sessions = await getSessionsByClientId(params.clientId);
    console.log('📱 [WhatsApp Action] Sessions found:', sessions.length);

    console.log('📱 [WhatsApp Action] Sending WhatsApp to:', client.phoneNumber);

    const whatsappResult = await sendOnboardingWithReceiptWhatsApp({
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      phoneNumber: client.phoneNumber,
      plan: {
        numberOfSessions: plan.numberOfSessions,
        joiningDate: plan.joiningDate,
        joiningTime: plan.joiningTime,
      },
      sessions: sessions.map((session) => ({
        sessionDate: session.sessionDate,
        startTime: session.startTime,
      })),
      payment: {
        amount: params.amount,
        paymentMode: params.paymentMode,
        transactionReference: params.transactionReference || `TXN-${Date.now()}`,
      },
      vehicleDetails: {
        name: vehicle?.name || 'Vehicle',
        number: vehicle?.number || 'N/A',
        type: 'Driving School Vehicle',
      },
    });

    console.log('📱 [WhatsApp Action] WhatsApp result:', whatsappResult);
    return whatsappResult;
  } catch (error) {
    console.error('❌ [WhatsApp Action] Error:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function sendWhatsAppAfterPaymentModeSelection(params: {
  clientId: string;
  planId: string;
  paymentMode: 'CASH' | 'QR' | 'PAYMENT_LINK';
  amount: number;
}) {
  try {
    console.log('📱 [Payment Mode Selection] Sending WhatsApp for:', params);

    // Validate UUIDs
    if (!params.clientId || params.clientId.trim() === '') {
      console.error('❌ [Payment Mode Selection] Invalid clientId:', params.clientId);
      return { success: false, error: 'Invalid client ID' };
    }

    if (!params.planId || params.planId.trim() === '') {
      console.error('❌ [Payment Mode Selection] Invalid planId:', params.planId);
      return { success: false, error: 'Invalid plan ID' };
    }

    // Get client details
    const client = await db.query.ClientTable.findFirst({
      where: eq(ClientTable.id, params.clientId),
    });

    if (!client) {
      console.error('❌ [Payment Mode Selection] Client not found:', params.clientId);
      return { success: false, error: 'Client not found' };
    }

    // Get plan details
    const plan = await db.query.PlanTable.findFirst({
      where: eq(PlanTable.id, params.planId),
    });

    if (!plan) {
      console.error('❌ [Payment Mode Selection] Plan not found:', params.planId);
      return { success: false, error: 'Plan not found' };
    }

    // Get vehicle details
    const vehicle = await db.query.VehicleTable.findFirst({
      where: eq(VehicleTable.id, plan.vehicleId),
    });

    // Get sessions
    const sessions = await getSessionsByClientId(params.clientId);

    console.log('📱 [Payment Mode Selection] Sending comprehensive onboarding message');

    const whatsappResult = await sendOnboardingWithReceiptWhatsApp({
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      phoneNumber: client.phoneNumber,
      plan: {
        numberOfSessions: plan.numberOfSessions,
        joiningDate: plan.joiningDate,
        joiningTime: plan.joiningTime,
      },
      sessions: sessions.map((session) => ({
        sessionDate: session.sessionDate,
        startTime: session.startTime,
      })),
      payment: {
        amount: params.amount,
        paymentMode: params.paymentMode,
        transactionReference: `TXN-${Date.now()}`,
      },
      vehicleDetails: {
        name: vehicle?.name || 'Vehicle',
        number: vehicle?.number || 'N/A',
        type: 'Driving School Vehicle',
      },
    });

    console.log('📱 [Payment Mode Selection] WhatsApp result:', whatsappResult);
    return whatsappResult;
  } catch (error) {
    console.error('❌ [Payment Mode Selection] Error:', error);
    return { success: false, error: (error as Error).message };
  }
}

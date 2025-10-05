'use server';

import { z } from 'zod';
import {
  updateRTOService as updateRTOServiceInDB,
  deleteRTOService as deleteRTOServiceInDB,
} from './db';
import { ActionReturnType } from '@/types/actions';
import { getRTOService } from './db';
import { getBranchConfig } from '@/server/db/branch';
import { getNextClientCode } from '@/db/utils/client-code';
import { rtoServicesFormSchema, rtoServicesFormSchemaWithOptionalPayment } from '../types';
import { addRTOService as addRTOServiceInDB, createPayment as createPaymentInDB } from './db';
import { insertClient, updateClient } from './db';
import { dateToString } from '@/lib/date-utils';
import { getRTOServiceCharges } from '../lib/charges';
import { paymentSchema } from '@/features/enrollment/types';

export async function addRTOService(
  unsafeData: z.infer<typeof rtoServicesFormSchema>
): Promise<{ clientId?: string; serviceId?: string; error: boolean; message: string }> {
  try {
    // Validate the data

    console.log(unsafeData);
    const {
      success,
      data,
      error: validationError,
    } = rtoServicesFormSchemaWithOptionalPayment.safeParse(unsafeData);

    if (!success) {
      console.error('RTO service validation failed:', validationError.errors);
      console.error('Invalid data received:', JSON.stringify(unsafeData, null, 2));
      return {
        error: true,
        message: `Invalid RTO service data: ${validationError.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      };
    }

    const { tenantId, id: branchId } = await getBranchConfig();

    // First, create the RTO client with generated client code
    const clientCode = await getNextClientCode(tenantId);

    const clientInformation = {
      clientCode,
      ...data.personalInfo,
      birthDate: dateToString(data.personalInfo.birthDate),
    };

    let client = null;
    if (data.clientId) {
      client = await updateClient(clientInformation, data.clientId);
    } else {
      client = await insertClient(clientInformation);
    }

    if (!client) {
      return {
        error: true,
        message: 'something went wrong',
      };
    }

    const { governmentFees, additionalCharges } = getRTOServiceCharges(data.service.type);

    const response = await addRTOServiceInDB({
      branchId,
      clientId: client.id,
      serviceType: data.service.type,
      governmentFees,
      serviceCharge: additionalCharges.max,
    });

    return {
      error: false,
      message: 'RTO service and client added successfully',
      clientId: response.clientId,
      serviceId: response.id,
    };
  } catch (error) {
    console.error('Error adding RTO service:', error);
    return {
      error: true,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Server action to update an existing RTO service
 */
export async function updateRTOService(
  id: string,
  unsafeData: z.infer<typeof rtoServicesFormSchema>
): ActionReturnType {
  try {
    // Validate the data
    const { success, data, error: validationError } = rtoServicesFormSchema.safeParse(unsafeData);

    if (!success) {
      console.error('RTO service validation failed:', validationError.errors);
      console.error('Invalid data received:', JSON.stringify(unsafeData, null, 2));
      return {
        error: true,
        message: `Invalid RTO service data: ${validationError.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      };
    }

    // Get the existing RTO service to find the RTO client ID
    const existingService = await getRTOService(id);
    if (!existingService) {
      return { error: true, message: 'RTO service not found' };
    }

    const { id: branchId } = await getBranchConfig();

    console.log(data, branchId);

    return {
      error: false,
      message: 'RTO service updated successfully',
    };
  } catch (error) {
    console.error('Error updating RTO service:', error);
    return {
      error: true,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Server action to delete an RTO service
 */
export async function deleteRTOService(id: string): ActionReturnType {
  try {
    const { id: branchId } = await getBranchConfig();

    await deleteRTOServiceInDB(id, branchId);

    return {
      error: false,
      message: 'RTO service deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting RTO service:', error);
    return {
      error: true,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Server action to update RTO service status
 */
export async function updateRTOServiceStatus(
  id: string,
  status:
    | 'PENDING'
    | 'DOCUMENT_COLLECTION'
    | 'APPLICATION_SUBMITTED'
    | 'UNDER_REVIEW'
    | 'APPROVED'
    | 'REJECTED'
    | 'COMPLETED'
    | 'CANCELLED'
): ActionReturnType {
  try {
    await updateRTOServiceInDB(id, { status });

    return {
      error: false,
      message: 'RTO service status updated successfully',
    };
  } catch (error) {
    console.error('Error updating RTO service status:', error);
    return {
      error: true,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

export const createPayment = async (
  unsafeData: z.infer<typeof paymentSchema>,
  serviceId: string
): Promise<{ error: boolean; message: string; paymentId?: string }> => {
  try {
    // 3. Validate payment data
    const { success, data, error } = paymentSchema.safeParse({
      ...unsafeData,
    });

    if (!success) {
      console.error('Payment validation error:', error);
      return { error: true, message: 'Invalid payment data' };
    }

    // 4. Upsert payment
    const paymentId = await createPaymentInDB(data, data.paymentMode, serviceId);

    return {
      error: false,
      message: 'Payment acknowledged successfully',
      paymentId,
    };
  } catch (error) {
    console.error('Error processing payment data:', error);
    const message = error instanceof Error ? error.message : 'Failed to save payment information';
    return { error: true, message };
  }
};

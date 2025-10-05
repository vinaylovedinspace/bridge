'use server';

import { z } from 'zod';
import {
  updateRTOService as updateRTOServiceInDB,
  deleteRTOService as deleteRTOServiceInDB,
} from './db';
import { ActionReturnType } from '@/types/actions';
import { getBranchConfig } from '@/server/db/branch';
import { getNextClientCode } from '@/db/utils/client-code';
import { rtoServicesFormSchema, rtoServicesFormSchemaWithOptionalPayment } from '../types';
import { addRTOService as addRTOServiceInDB, createPayment as createPaymentInDB } from './db';
import { insertClient, updateClient } from './db';
import { dateToString } from '@/lib/date-utils';
import { getRTOServiceCharges } from '../lib/charges';
import { paymentSchema } from '@/features/enrollment/types';

export async function saveRTOService(
  unsafeData: z.infer<typeof rtoServicesFormSchema>
): Promise<{ clientId?: string; serviceId?: string; error: boolean; message: string }> {
  try {
    // Validate the data
    const { success, data } = rtoServicesFormSchemaWithOptionalPayment.safeParse(unsafeData);

    if (!success) {
      return {
        error: true,
        message: 'Invalid RTO service data',
      };
    }

    const { tenantId, id: branchId } = await getBranchConfig();
    const isUpdate = !!data.serviceId;

    // Prepare client information
    let clientCode: string;

    if (data.personalInfo.clientCode) {
      // Use clientCode from form (exists during updates)
      clientCode = data.personalInfo.clientCode;
    } else {
      // Generate new clientCode for new services
      clientCode = await getNextClientCode(tenantId);
    }

    const clientInformation = {
      ...data.personalInfo,
      clientCode,
      birthDate: dateToString(data.personalInfo.birthDate),
    };

    // Save client (update if exists, insert if new)
    const client = data.clientId
      ? await updateClient(clientInformation, data.clientId)
      : await insertClient(clientInformation);

    if (!client) {
      return {
        error: true,
        message: 'Failed to save client information',
      };
    }

    const { governmentFees, additionalCharges } = getRTOServiceCharges(data.service.type);

    // Save RTO service (update if exists, insert if new)
    let rtoService;
    if (isUpdate) {
      await updateRTOServiceInDB(data.serviceId!, {
        serviceType: data.service.type,
        governmentFees,
        serviceCharge: additionalCharges.max,
      });
      rtoService = { id: data.serviceId!, clientId: client.id };
    } else {
      rtoService = await addRTOServiceInDB({
        branchId,
        clientId: client.id,
        serviceType: data.service.type,
        governmentFees,
        serviceCharge: additionalCharges.max,
      });
    }

    return {
      error: false,
      message: isUpdate ? 'RTO service updated successfully' : 'RTO service added successfully',
      clientId: client.id,
      serviceId: rtoService.id,
    };
  } catch (error) {
    console.error('Error saving RTO service:', error);
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

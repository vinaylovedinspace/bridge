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
import { rtoServicesFormSchema } from '../types';

/**
 * Server action to add a new RTO service
 */
export async function addRTOService(
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

    const { tenantId } = await getBranchConfig();

    // First, create the RTO client with generated client code
    const clientCode = await getNextClientCode(tenantId);

    console.log(data, clientCode);

    return {
      error: false,
      message: 'RTO service and client added successfully',
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

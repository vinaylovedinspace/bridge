'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import {
  addStaff as addStaffInDB,
  updateStaff as updateStaffInDB,
  deleteStaff as deleteStaffInDB,
} from './db';
import { ActionReturnType } from '@/types/actions';
import { staffFormSchema } from '../schemas/staff';
import { getBranchConfig } from '@/server/actions/branch';

/**
 * Server action to add a new staff member
 */
export async function addStaff(unsafeData: z.infer<typeof staffFormSchema>): ActionReturnType {
  try {
    const { userId } = await auth();

    // Validate the data
    const { success, data } = staffFormSchema.safeParse(unsafeData);

    if (!success) {
      return { error: true, message: 'Invalid staff data' };
    }

    const { id: branchId } = await getBranchConfig();

    if (!branchId) {
      return { error: true, message: 'Branch not found' };
    }

    await addStaffInDB({
      ...data,
      branchId,
      createdBy: userId!,
      assignedVehicleId: data.assignedVehicleId || null,
      licenseNumber: data.licenseNumber || null,
      licenseIssueDate: data.licenseIssueDate || null,
      experienceYears: data.experienceYears || null,
      educationLevel: data.educationLevel || null,
    });

    return {
      error: false,
      message: 'Staff member added successfully',
    };
  } catch (error) {
    console.error('Error adding staff:', error);
    return {
      error: true,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Server action to update an existing staff member
 */
export async function updateStaff(
  id: string,
  unsafeData: z.infer<typeof staffFormSchema>
): ActionReturnType {
  try {
    const { userId } = await auth();

    // Validate the data
    const { success, data } = staffFormSchema.safeParse(unsafeData);

    if (!success) {
      return { error: true, message: 'Invalid staff data' };
    }
    const { id: branchId } = await getBranchConfig();

    await updateStaffInDB(id, {
      ...data,
      branchId,
      createdBy: userId!,
      assignedVehicleId: data.assignedVehicleId || null,
      licenseNumber: data.licenseNumber || null,
      licenseIssueDate: data.licenseIssueDate || null,
      experienceYears: data.experienceYears || null,
      educationLevel: data.educationLevel || null,
    });

    return {
      error: false,
      message: 'Staff member updated successfully',
    };
  } catch (error) {
    console.error('Error updating staff:', error);
    return {
      error: true,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Server action to delete (soft delete) a staff member
 */
export async function deleteStaff(id: string): ActionReturnType {
  try {
    const { id: branchId } = await getBranchConfig();

    await deleteStaffInDB(id, branchId);

    return {
      error: false,
      message: 'Staff member deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting staff:', error);
    return {
      error: true,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

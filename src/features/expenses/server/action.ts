'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import {
  addExpense as addExpenseInDB,
  updateExpense as updateExpenseInDB,
  deleteExpense as deleteExpenseInDB,
} from './db';
import { ActionReturnType } from '@/types/actions';
import { expenseFormSchema } from '../schemas/expense';
import { getBranchConfig } from '@/server/db/branch';

/**
 * Server action to add a new expense
 */
export async function addExpense(unsafeData: z.infer<typeof expenseFormSchema>): ActionReturnType {
  try {
    const { userId } = await auth();

    // Validate the data
    const { success, data } = expenseFormSchema.safeParse(unsafeData);

    if (!success) {
      return { error: true, message: 'Invalid expense data' };
    }
    const { id: branchId } = await getBranchConfig();

    await addExpenseInDB({
      ...data,
      branchId,
      createdBy: userId!,
    });

    return {
      error: false,
      message: 'Expense added successfully',
    };
  } catch (error) {
    console.error('Error adding expense:', error);
    return {
      error: true,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Server action to update an existing expense
 */
export async function updateExpense(
  id: string,
  unsafeData: z.infer<typeof expenseFormSchema>
): ActionReturnType {
  try {
    const { userId } = await auth();

    // Validate the data
    const { success, data } = expenseFormSchema.safeParse(unsafeData);

    if (!success) {
      return { error: true, message: 'Invalid expense data' };
    }

    const { id: branchId } = await getBranchConfig();

    await updateExpenseInDB(id, {
      ...data,
      branchId,
      createdBy: userId!,
    });

    return {
      error: false,
      message: 'Expense updated successfully',
    };
  } catch (error) {
    console.error('Error updating expense:', error);
    return {
      error: true,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Server action to delete (soft delete) an expense
 */
export async function deleteExpense(id: string): ActionReturnType {
  try {
    const { id: branchId } = await getBranchConfig();

    await deleteExpenseInDB(id, branchId);

    return {
      error: false,
      message: 'Expense deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting expense:', error);
    return {
      error: true,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

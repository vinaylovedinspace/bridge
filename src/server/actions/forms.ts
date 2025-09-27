'use server';

import { getClients, getClient } from '@/server/db/client';
import {
  getEligibleStudentsForLearnersLicense as _getEligibleStudentsForLearnersLicense,
  getEligibleStudentsForPermanentLicense as _getEligibleStudentsForPermanentLicense,
  getBulkClientDataForForms as _getBulkClientDataForForms,
  insertFormPrints,
  type FilterType,
} from '@/server/db/forms';
import { getCurrentOrganizationBranchId } from '@/server/db/branch';
import { auth } from '@clerk/nextjs/server';

export const getClientsForForms = async () => {
  return getClients();
};

export const getClientForForm = async (clientId: string) => {
  return getClient(clientId);
};

export const getEligibleStudentsForLearnersLicense = async (filter: FilterType = 'new-only') => {
  const branchId = await getCurrentOrganizationBranchId();
  if (!branchId) throw new Error('No branch found');

  return _getEligibleStudentsForLearnersLicense(filter);
};

export const getEligibleStudentsForPermanentLicense = async (filter: FilterType = 'new-only') => {
  const branchId = await getCurrentOrganizationBranchId();
  if (!branchId) throw new Error('No branch found');

  return _getEligibleStudentsForPermanentLicense(filter);
};

export const markFormsAsPrinted = async (clientIds: string[], formType: string) => {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const branchId = await getCurrentOrganizationBranchId();
  if (!branchId) throw new Error('No branch found');

  const batchId = crypto.randomUUID();

  await insertFormPrints(branchId, clientIds, formType, userId, batchId);

  return batchId;
};

export const getFormPrintStats = async (formType: 'form-2' | 'form-4' = 'form-4') => {
  const branchId = await getCurrentOrganizationBranchId();
  if (!branchId) throw new Error('No branch found');

  const getStudentsFunction =
    formType === 'form-2'
      ? (filter: FilterType) => _getEligibleStudentsForLearnersLicense(filter)
      : (filter: FilterType) => _getEligibleStudentsForPermanentLicense(filter);

  const [totalEligible, newEligible, recentlyPrinted] = await Promise.all([
    getStudentsFunction('all-eligible'),
    getStudentsFunction('new-only'),
    getStudentsFunction('recently-printed'),
  ]);

  return {
    totalEligible: totalEligible.length,
    newEligible: newEligible.length,
    recentlyPrinted: recentlyPrinted.length,
    alreadyPrinted: totalEligible.length - newEligible.length,
  };
};

export const getBulkClientDataForForms = async (clientIds: string[]) => {
  const branchId = await getCurrentOrganizationBranchId();
  if (!branchId) throw new Error('No branch found');

  return _getBulkClientDataForForms(branchId, clientIds);
};

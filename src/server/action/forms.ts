'use server';

import { getClients, getClient } from '@/server/db/client';
import {
  getEligibleStudentsForLearnersLicense as _getEligibleStudentsForLearnersLicense,
  getEligibleStudentsForPermanentLicense as _getEligibleStudentsForPermanentLicense,
  getBulkClientDataForForms as _getBulkClientDataForForms,
  insertFormPrints,
  type FilterType,
} from '@/server/db/forms';
import { auth } from '@clerk/nextjs/server';
import { getBranchConfig } from '@/server/action/branch';

export const getClientsForForms = async () => {
  return getClients();
};

export const getClientForForm = async (clientId: string) => {
  return getClient(clientId);
};

export const getEligibleStudentsForLearnersLicense = async (filter: FilterType = 'new-only') => {
  return _getEligibleStudentsForLearnersLicense(filter);
};

export const getEligibleStudentsForPermanentLicense = async (filter: FilterType = 'new-only') => {
  return _getEligibleStudentsForPermanentLicense(filter);
};

export const markFormsAsPrinted = async (clientIds: string[], formType: string) => {
  const { userId } = await auth();
  const batchId = crypto.randomUUID();
  const { id: branchId } = await getBranchConfig();

  await insertFormPrints(branchId, clientIds, formType, userId!, batchId);

  return batchId;
};

export const getFormPrintStats = async (formType: 'form-2' | 'form-4' = 'form-4') => {
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
  const { id: branchId } = await getBranchConfig();
  return _getBulkClientDataForForms(branchId, clientIds);
};

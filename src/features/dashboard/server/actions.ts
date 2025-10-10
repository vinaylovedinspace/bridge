'use server';

import { getBranchConfig } from '@/server/actions/branch';
import {
  getAdmissionStatistics as getAdmissionStatisticsFromDB,
  getLicenceWorkCount as getLicenceWorkCountFromDB,
  getOverduePaymentsCount as getOverduePaymentsCountFromDB,
  getInstructorStatusCount as getInstructorStatusCountFromDB,
} from './db';

export async function getRemainingLicenseWorkCount() {
  const { id: branchId } = await getBranchConfig();

  return await getLicenceWorkCountFromDB(branchId);
}

export type LicenceWorkCount = Awaited<ReturnType<typeof getRemainingLicenseWorkCount>>;

export const getOverduePaymentsCount = async () => {
  const { id: branchId } = await getBranchConfig();

  return await getOverduePaymentsCountFromDB(branchId);
};

export const getInstructorStatusCount = async () => {
  const { id: branchId } = await getBranchConfig();

  return await getInstructorStatusCountFromDB(branchId);
};

export const getAdmissionStatistics = async (months: number = 6) => {
  const { id: branchId } = await getBranchConfig();

  return await getAdmissionStatisticsFromDB(branchId, months);
};
export type AdmissionStatistics = Awaited<ReturnType<typeof getAdmissionStatistics>>;

/**
 * Jotai atom for branch configuration
 * Used to avoid prop drilling of branch config through component trees
 */

import { atom } from 'jotai';
import { BranchConfig } from '@/server/actions/branch';
import { DEFAULT_OPERATING_HOURS, DEFAULT_WORKING_DAYS } from '../constants/business';

/**
 * Global atom for branch configuration
 * Should be hydrated at the page level with server-fetched data
 */
export const branchConfigAtom = atom<BranchConfig | null>(null);

/**
 * Derived atom for branch ID
 */
export const branchIdAtom = atom((get) => {
  const branchConfig = get(branchConfigAtom);
  return branchConfig?.id ?? '';
});

/**
 * Derived atom for branch service charge
 */
export const branchServiceChargeAtom = atom((get) => {
  const branchConfig = get(branchConfigAtom);
  return branchConfig?.licenseServiceCharge ?? 0;
});

export const branchWorkingDaysAtom = atom((get) => {
  const branchConfig = get(branchConfigAtom);
  return branchConfig?.workingDays ?? DEFAULT_WORKING_DAYS;
});

export const branchOperatingHoursAtom = atom((get) => {
  const branchConfig = get(branchConfigAtom);
  return branchConfig?.operatingHours ?? DEFAULT_OPERATING_HOURS;
});

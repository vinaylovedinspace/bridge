'use client';

/**
 * Branch Config Provider
 * Hydrates the branchConfigAtom for all child components
 * Should be placed in the layout after fetching branchConfig server-side
 */

import { useHydrateAtoms } from 'jotai/utils';
import { branchConfigAtom } from '@/lib/atoms/branch-config';
import type { BranchConfig } from '@/server/db/branch';

type BranchConfigProviderProps = {
  branchConfig: BranchConfig;
  children: React.ReactNode;
};

export function BranchConfigProvider({ branchConfig, children }: BranchConfigProviderProps) {
  useHydrateAtoms([[branchConfigAtom, branchConfig]]);
  return children;
}

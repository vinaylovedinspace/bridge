'use client';

import useSWR from 'swr';
import type { BranchConfig } from '@/server/db/branch';

const fetcher = async (url: string): Promise<BranchConfig> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch branch settings');
  }
  return response.json();
};

export function useBranchSettings() {
  const response = useSWR('/api/branch/settings', fetcher, {
    revalidateOnMount: true,
  });

  return response;
}

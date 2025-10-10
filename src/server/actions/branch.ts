'use server';
import { auth } from '@clerk/nextjs/server';
import { dbCache } from '@/lib/cache';
import { getIdTag } from '@/lib/cache';
import { CACHE_TAGS } from '@/lib/cache';
import { _getBranchConfig } from '@/server/db/branch';

export const getBranchConfig = async () => {
  const { orgId } = await auth();

  const cacheFn = dbCache(_getBranchConfig, {
    tags: [getIdTag(orgId!, CACHE_TAGS.branch)],
  });

  return cacheFn(orgId!);
};

export type BranchConfig = NonNullable<Awaited<ReturnType<typeof getBranchConfig>>>;

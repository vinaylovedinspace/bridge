import { db } from '@/db';
import { CACHE_TAGS, dbCache, getIdTag } from '@/lib/cache';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

const _getBranchConfig = async (orgId: string) => {
  const branch = await db.query.BranchTable.findFirst({
    where: (table) => eq(table.orgId, orgId!),
    columns: {
      id: true,
      workingDays: true,
      operatingHours: true,
      licenseServiceCharge: true,
      defaultRtoOffice: true,
      tenantId: true,
    },
  });

  return branch!;
};

export const getBranchConfig = async () => {
  const { orgId } = await auth();

  const cacheFn = dbCache(_getBranchConfig, {
    tags: [getIdTag(orgId!, CACHE_TAGS.branch)],
  });

  return cacheFn(orgId!);
};

export const getBranchConfigWithTenant = async () => {
  const { orgId } = await auth();

  const branch = await db.query.BranchTable.findFirst({
    where: (table) => eq(table.orgId, orgId!),
    columns: {
      id: true,
      workingDays: true,
      operatingHours: true,
      licenseServiceCharge: true,
      defaultRtoOffice: true,
    },
    with: {
      tenant: true,
    },
  });

  return branch!;
};

export type BranchConfig = NonNullable<Awaited<ReturnType<typeof getBranchConfig>>>;

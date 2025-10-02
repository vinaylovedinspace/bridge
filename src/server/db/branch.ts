import { db } from '@/db';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

export const getBranchConfig = async () => {
  const { orgId } = await auth();

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

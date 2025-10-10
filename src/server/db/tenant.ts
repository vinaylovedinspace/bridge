import { db } from '@/db';
import { TenantTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getBranchConfig } from '@/server/action/branch';

export const getTenantById = async (tenantId: string) => {
  const tenant = await db.query.TenantTable.findFirst({
    where: eq(TenantTable.id, tenantId),
  });

  return tenant || null;
};

export const getTenantNameById = async (tenantId: string): Promise<string | null> => {
  const tenant = await getTenantById(tenantId);
  return tenant?.name || null;
};

export const getCurrentTenant = async () => {
  const { tenantId } = await getBranchConfig();

  return await getTenantById(tenantId);
};

export const getCurrentTenantName = async (): Promise<string | null> => {
  const tenant = await getCurrentTenant();
  return tenant?.name || null;
};

export type Tenant = Awaited<ReturnType<typeof getTenantById>>;

import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/db';
import { BranchTable, TenantTable } from '@/db/schema';

type BranchInput = {
  name: string;
};

export async function createTenantWithBranches(
  tenantData: typeof TenantTable.$inferInsert,
  branchesInput: Array<BranchInput>,
  userId: string
) {
  return await db.transaction(async (tx) => {
    const createdOrgIds: string[] = [];

    try {
      const clerk = await clerkClient();
      const branchesData = [];

      // Create organizations in Clerk
      for (const branch of branchesInput) {
        const clerkOrg = await clerk.organizations.createOrganization({
          name: `${tenantData.name} - ${branch.name}`,
          createdBy: userId,
        });

        createdOrgIds.push(clerkOrg.id);

        branchesData.push({
          name: branch.name,
          orgId: clerkOrg.id,
          createdBy: userId,
        });
      }

      const [tenant] = await tx.insert(TenantTable).values(tenantData).returning({
        id: TenantTable.id,
        ownerId: TenantTable.ownerId,
      });

      const branchesWithTenantId = branchesData.map((branch) => ({
        ...branch,
        tenantId: tenant.id,
      }));

      const branches = await tx.insert(BranchTable).values(branchesWithTenantId).returning({
        id: BranchTable.id,
        createdBy: BranchTable.createdBy,
        tenantId: BranchTable.tenantId,
        orgId: BranchTable.orgId,
      });

      for (const orgId of createdOrgIds) {
        await clerk.organizations.updateOrganization(orgId, {
          publicMetadata: {
            tenantId: tenant.id,
            branchId: branches.find((b) => b.orgId === orgId)?.id,
          },
        });
      }

      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: {
          tenantId: tenant.id,
          branches: branches.map((b) => b.id),
          defaultOrganizationId: createdOrgIds[0],
          isOnboardingComplete: false,
        },
      });

      return {
        tenant,
        branches,
        organizationIds: createdOrgIds,
        primaryOrganizationId: createdOrgIds[0],
      };
    } catch (error) {
      // Before transaction rollback, clean up any created Clerk resources
      await rollbackClerkResources(createdOrgIds, userId);

      // Transaction will automatically roll back database operations
      console.error('Error in transaction:', error);
      throw error;
    }
  });
}

// Helper function to rollback Clerk resources
async function rollbackClerkResources(orgIds: string[], userId: string): Promise<void> {
  try {
    const clerk = await clerkClient();

    // Rollback organizations in Clerk
    for (const orgId of orgIds) {
      try {
        await clerk.organizations.deleteOrganization(orgId);
      } catch (e) {
        console.error(`Failed to delete Clerk organization ${orgId}:`, e);
      }
    }

    // Reset user metadata
    try {
      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: {
          tenantId: null,
          isOnboardingComplete: false,
        },
      });
    } catch (e) {
      console.error(`Failed to reset user metadata for ${userId}:`, e);
    }
  } catch (rollbackError) {
    // Log rollback errors but don't throw - we've already caught the original error
    console.error('Error during Clerk rollback:', rollbackError);
  }
}

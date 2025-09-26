'use server';

import { auth } from '@clerk/nextjs/server';
import { OnboardingFormValues } from '../components/types';
import { onboardingFormSchema } from '../components/types';
import { createTenantWithBranches } from './db';

export async function createTenant(unsafeData: OnboardingFormValues) {
  const { userId } = await auth();
  const { success, data } = onboardingFormSchema.safeParse(unsafeData);

  if (!success) {
    return { error: true, message: 'Invalid data' };
  }

  if (!userId) {
    return { error: true, message: 'User not authenticated' };
  }

  const tenantData = {
    name: data.schoolName,
    ownerId: userId,
  };

  try {
    // Create all operations within a single transaction
    const result = await createTenantWithBranches(tenantData, data.branches, userId);

    console.log('Tenant created successfully. Organizations created:', result.organizationIds);

    return {
      error: false,
      message: 'Tenant created successfully',
      organizationIds: result.organizationIds,
      primaryOrganizationId: result.primaryOrganizationId,
    };
  } catch (error) {
    console.error('Error during tenant/branch creation:', error);

    return {
      error: true,
      message:
        error instanceof Error
          ? `Failed to create tenant: ${error.message}`
          : 'Failed to create tenant due to an unknown error',
    };
  }
}

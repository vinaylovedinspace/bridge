'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';

export const markOnboardingComplete = async () => {
  const { userId } = await auth();

  if (!userId) return;

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: {
      isOnboardingComplete: true,
    },
  });
};

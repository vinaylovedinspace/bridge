'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';

export const markOnboardingComplete = async () => {
  console.log('triggering');
  const { userId } = await auth();

  if (!userId) return;

  const clerk = await clerkClient();
  console.log('userId', userId);
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: {
      isOnboardingComplete: true,
    },
  });
};

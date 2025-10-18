'use server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { and, eq, desc, sql } from 'drizzle-orm';
import { getBranchConfig } from './branch';

type GetNotificationsParams = {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
};

export async function getNotifications(params?: GetNotificationsParams) {
  const { userId } = await auth();
  const branch = await getBranchConfig();

  if (!userId || !branch.id) {
    throw new Error('Unauthorized');
  }

  const limit = params?.limit || 20;
  const offset = params?.offset || 0;
  const unreadOnly = params?.unreadOnly || false;

  // Only filter by branchId - show all branch notifications to all users in that branch
  const conditions = [eq(notifications.branchId, branch.id)];

  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }

  const [items, [{ count }]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(...conditions)),
  ]);

  const unreadCount = unreadOnly
    ? count
    : (
        await db
          .select({ count: sql<number>`count(*)` })
          .from(notifications)
          .where(and(eq(notifications.branchId, branch.id), eq(notifications.isRead, false)))
      )[0].count;

  return {
    notifications: items,
    totalCount: count,
    unreadCount,
    hasMore: offset + limit < count,
  };
}

export async function markNotificationAsRead(notificationId: number) {
  const { userId } = await auth();
  const branch = await getBranchConfig();

  if (!userId || !branch.id) {
    throw new Error('Unauthorized');
  }

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.branchId, branch.id), eq(notifications.id, notificationId)));

  return { success: true };
}

export async function markAllNotificationsAsRead() {
  const { userId } = await auth();
  const branch = await getBranchConfig();

  if (!userId || !branch.id) {
    throw new Error('Unauthorized');
  }

  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.branchId, branch.id), eq(notifications.isRead, false)));

  return { success: true };
}

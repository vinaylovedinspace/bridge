import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const getNotificationsFromDB = async (branchId: string) => {
  return await db.query.notifications.findMany({
    where: and(eq(notifications.isRead, false), eq(notifications.branchId, branchId)),
    orderBy: (notifications, { desc }) => [desc(notifications.createdAt)],
    limit: 5,
  });
};

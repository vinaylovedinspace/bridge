import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { and, eq, desc, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  const unreadOnly = searchParams.get('unread') === 'true';

  try {
    const conditions = [
      eq(notifications.userId, userId),
      eq(notifications.branchId, parseInt(orgId)),
    ];

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
            .where(
              and(
                eq(notifications.userId, userId),
                eq(notifications.branchId, parseInt(orgId)),
                eq(notifications.isRead, false)
              )
            )
        )[0].count;

    return NextResponse.json({
      notifications: items,
      totalCount: count,
      unreadCount,
      hasMore: offset + limit < count,
    });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { notificationIds, markAllAsRead } = (await req.json()) as {
      notificationIds?: number[];
      markAllAsRead?: boolean;
    };

    if (markAllAsRead) {
      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.branchId, parseInt(orgId)),
            eq(notifications.isRead, false)
          )
        );
    } else if (notificationIds && notificationIds.length > 0) {
      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.branchId, parseInt(orgId)),
            sql`${notifications.id} = ANY(${notificationIds})`
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update notifications:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}

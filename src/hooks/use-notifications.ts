'use client';

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { Notification } from '@/db/schema';
import { toast } from 'sonner';

type NotificationsResponse = {
  notifications: Notification[];
  totalCount: number;
  unreadCount: number;
  hasMore: boolean;
};

const NOTIFICATIONS_KEY = '/api/notifications';
const POLL_INTERVAL = 30000; // 30 seconds

async function fetcher(url: string): Promise<NotificationsResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export function useNotifications() {
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const {
    data,
    error,
    isLoading,
    mutate: mutateNotifications,
  } = useSWR<NotificationsResponse>(
    `${NOTIFICATIONS_KEY}?limit=${limit}&offset=${offset}`,
    fetcher,
    {
      refreshInterval: POLL_INTERVAL,
      revalidateOnFocus: true,
    }
  );

  const markAsRead = useCallback(
    async (notificationId: number) => {
      try {
        const res = await fetch(NOTIFICATIONS_KEY, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationIds: [notificationId] }),
        });

        if (!res.ok) throw new Error('Failed to mark notification as read');

        // Update local data optimistically
        mutateNotifications((current) => {
          if (!current) return current;
          return {
            ...current,
            notifications: current.notifications.map((n) =>
              n.id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
            ),
            unreadCount: Math.max(0, current.unreadCount - 1),
          };
        }, false);

        // Revalidate all notification queries
        mutate((key) => typeof key === 'string' && key.startsWith(NOTIFICATIONS_KEY));
      } catch {
        toast.error('Failed to mark notification as read');
      }
    },
    [mutateNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch(NOTIFICATIONS_KEY, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (!res.ok) throw new Error('Failed to mark all notifications as read');

      // Update local data optimistically
      mutateNotifications((current) => {
        if (!current) return current;
        return {
          ...current,
          notifications: current.notifications.map((n) => ({
            ...n,
            isRead: true,
            readAt: new Date(),
          })),
          unreadCount: 0,
        };
      }, false);

      // Revalidate all notification queries
      mutate((key) => typeof key === 'string' && key.startsWith(NOTIFICATIONS_KEY));

      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all notifications as read');
    }
  }, [mutateNotifications]);

  const loadMore = useCallback(() => {
    setOffset((prev) => prev + limit);
  }, [limit]);

  return {
    notifications: data?.notifications || [],
    totalCount: data?.totalCount || 0,
    unreadCount: data?.unreadCount || 0,
    hasMore: data?.hasMore || false,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    loadMore,
    refetch: mutateNotifications,
  };
}

// Hook to get just the unread count for the badge
export function useUnreadNotificationCount() {
  const { data } = useSWR<NotificationsResponse>(
    `${NOTIFICATIONS_KEY}?limit=1&unread=true`,
    fetcher,
    {
      refreshInterval: POLL_INTERVAL,
      revalidateOnFocus: true,
    }
  );

  return data?.unreadCount || 0;
}

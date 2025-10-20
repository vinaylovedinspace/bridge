'use client';

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { Notification } from '@/db/schema';
import { toast } from 'sonner';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/server/action/notifications';

type NotificationsResponse = {
  notifications: Notification[];
  totalCount: number;
  unreadCount: number;
  hasMore: boolean;
};

const NOTIFICATIONS_KEY = 'notifications';
const POLL_INTERVAL = 30000; // 30 seconds

export function useNotifications(limit = 20, offset = 0) {
  const {
    data,
    error,
    isLoading,
    mutate: mutateNotifications,
  } = useSWR<NotificationsResponse>(
    [NOTIFICATIONS_KEY, limit, offset],
    () => getNotifications({ limit, offset }),
    {
      revalidateOnMount: true,
    }
  );

  const markAsRead = useCallback(
    async (notificationId: number) => {
      try {
        // Update local data optimistically
        mutateNotifications(
          (current) => {
            if (!current) return current;
            return {
              ...current,
              notifications: current.notifications.map((n) =>
                n.id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
              ),
              unreadCount: Math.max(0, current.unreadCount - 1),
            };
          },
          { revalidate: false }
        );

        await markNotificationAsRead(notificationId);

        // Revalidate all notification queries
        mutate((key) => Array.isArray(key) && key[0] === NOTIFICATIONS_KEY);
      } catch {
        toast.error('Failed to mark notification as read');
        // Revert optimistic update on error
        mutateNotifications();
      }
    },
    [mutateNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      // Update local data optimistically
      mutateNotifications(
        (current) => {
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
        },
        { revalidate: false }
      );

      await markAllNotificationsAsRead();

      // Revalidate all notification queries
      mutate((key) => Array.isArray(key) && key[0] === NOTIFICATIONS_KEY);

      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all notifications as read');
      // Revert optimistic update on error
      mutateNotifications();
    }
  }, [mutateNotifications]);

  return {
    notifications: data?.notifications || [],
    totalCount: data?.totalCount || 0,
    unreadCount: data?.unreadCount || 0,
    hasMore: data?.hasMore || false,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: mutateNotifications,
  };
}

// Hook to get just the unread count for the badge
export function useUnreadNotificationCount() {
  const { data } = useSWR<NotificationsResponse>(
    [NOTIFICATIONS_KEY, 'unread', 1],
    () => getNotifications({ limit: 1, unreadOnly: true }),
    {
      refreshInterval: POLL_INTERVAL,
      revalidateOnFocus: true,
    }
  );

  return data?.unreadCount || 0;
}

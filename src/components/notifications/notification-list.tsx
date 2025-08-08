'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Notification } from '@/db/schema';
import { NotificationItem } from './notification-item';
import { Loader2 } from 'lucide-react';

type NotificationListProps = {
  notifications: Notification[];
  isLoading: boolean;
  onMarkAsRead: (id: number) => void;
  onLoadMore: () => void;
  hasMore: boolean;
};

export function NotificationList({
  notifications,
  isLoading,
  onMarkAsRead,
  onLoadMore,
  hasMore,
}: NotificationListProps) {
  if (isLoading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
    );
  }

  return (
    <>
      <ScrollArea className="h-[400px]">
        <div className="space-y-1 p-1">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
            />
          ))}
        </div>
      </ScrollArea>
      {hasMore && (
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load more'}
          </Button>
        </div>
      )}
    </>
  );
}

'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { NotificationList } from './notification-list';
import { useNotifications } from '@/hooks/use-notifications';

export function NotificationBell() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, loadMore, hasMore } =
    useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <Separator />
        <div className="mt-3">
          <NotificationList
            notifications={notifications}
            isLoading={isLoading}
            onMarkAsRead={markAsRead}
            onLoadMore={loadMore}
            hasMore={hasMore}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

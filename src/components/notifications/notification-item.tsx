'use client';

import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Notification } from '@/db/schema';
import { getNotificationIcon } from './notification-icons';
import Link from 'next/link';

type NotificationItemProps = {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
};

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const Icon = getNotificationIcon(notification.type);
  const link = getNotificationLink(notification);

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
  };

  const content = (
    <div
      className={cn(
        'flex gap-3 rounded-lg p-3 transition-colors cursor-pointer',
        !notification.isRead && 'bg-muted/50 hover:bg-muted',
        notification.isRead && 'hover:bg-muted/30'
      )}
      onClick={handleClick}
    >
      <div className="flex-shrink-0">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            !notification.isRead ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex-1 space-y-1">
        <p className={cn('text-sm leading-tight', !notification.isRead && 'font-medium')}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
      {!notification.isRead && (
        <div className="flex-shrink-0">
          <div className="h-2 w-2 rounded-full bg-primary" />
        </div>
      )}
    </div>
  );

  if (link) {
    return (
      <Link href={link} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

function getNotificationLink(notification: Notification): string | null {
  const { entityType, entityId } = notification;

  if (!entityType || !entityId) return null;

  switch (entityType) {
    case 'CLIENT':
      return `/clients/${entityId}`;
    case 'PAYMENT':
      return `/payments`;
    case 'VEHICLE':
      return `/vehicles/${entityId}`;
    case 'SESSION':
      return `/calendar`;
    case 'RTO_SERVICE':
      return `/rto-services/${entityId}`;
    default:
      return null;
  }
}

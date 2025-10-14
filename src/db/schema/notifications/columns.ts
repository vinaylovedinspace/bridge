import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  timestamp,
  text,
  jsonb,
  pgEnum,
  uuid,
} from 'drizzle-orm/pg-core';

export const EntityTypeEnum = pgEnum('entity_type', [
  'CLIENT',
  'PAYMENT',
  'VEHICLE',
  'SESSION',
  'RTO_SERVICE',
  'LICENSE',
]);

export const NotificationTypeEnum = pgEnum('notification_type', [
  'PAYMENT_RECEIVED',
  'INSTALLMENT_DUE',
  'INSTALLMENT_OVERDUE',
  'PAY_LATER_REMINDER',
  'REFUND_PROCESSED',
  'LEARNING_TEST_TODAY',
  'ELIGIBLE_FOR_DRIVING_TEST',
  'LICENSE_ISSUED',
  'LICENSE_RENEWAL_DUE',
  'VEHICLE_DOCUMENT_EXPIRING',
  'VEHICLE_DOCUMENT_EXPIRED',
  'VEHICLE_MAINTENANCE_DUE',
  'SESSION_TODAY',
  'SESSION_CANCELLED',
  'SESSION_RESCHEDULED',
  'RTO_STATUS_UPDATED',
  'RTO_SERVICE_COMPLETED',
  'RTO_TATKAL_DEADLINE',
  'NEW_CLIENT_ADMISSION',
  'REPORT_READY',
  'LOW_CAPACITY_WARNING',
]);

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  type: NotificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  entityType: EntityTypeEnum('entity_type'),
  entityId: integer('entity_id'),
  metadata: jsonb('metadata'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  readAt: timestamp('read_at'),
  deletedAt: timestamp('deleted_at'),
});

export const notificationPreferences = pgTable('notification_preferences', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  notificationType: varchar('notification_type', { length: 50 }).notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  emailEnabled: boolean('email_enabled').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;

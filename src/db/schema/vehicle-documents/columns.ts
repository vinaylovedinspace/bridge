import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const vehicleDocumentTypes = pgEnum('vehicle_document_types', [
  'PUC',
  'INSURANCE',
  'REGISTRATION',
]);

export const VehicleDocumentTable = pgTable('vehicle_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: text('url').notNull(),

  name: text('name'),
  type: vehicleDocumentTypes(),

  vehicleId: uuid('vehicle_id').notNull(),

  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
});

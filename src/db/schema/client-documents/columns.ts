import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const clientDocumentTypes = pgEnum('client_document_types', ['AADHAAR_CARD', 'PAN_CARD']);

export const ClientDocumentTable = pgTable('client_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: text('url').notNull(),

  name: text('name'),
  type: clientDocumentTypes(),

  clientId: uuid('client_id').notNull(),

  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
});

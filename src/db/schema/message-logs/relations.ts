import { relations } from 'drizzle-orm';
import { MessageLogsTable } from './columns';
import { ClientTable } from '../client/columns';

export const MessageLogsRelations = relations(MessageLogsTable, ({ one }) => ({
  client: one(ClientTable, {
    fields: [MessageLogsTable.clientId],
    references: [ClientTable.id],
  }),
}));

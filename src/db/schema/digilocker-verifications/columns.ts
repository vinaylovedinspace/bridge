import { pgEnum, pgTable, text, timestamp, uuid, jsonb, unique } from 'drizzle-orm/pg-core';

export const DigilockerStatusEnum = pgEnum('digilocker_status', [
  'PENDING',
  'AUTHORIZED',
  'COMPLETED',
  'FAILED',
]);

export const DigilockerVerificationTable = pgTable(
  'digilocker_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: text('client_id').notNull(), // Surepass client_id
    phoneNumber: text('phone_number').notNull(),
    status: DigilockerStatusEnum('status').notNull().default('PENDING'),

    // Store the raw Aadhaar data from Surepass
    aadhaarData: jsonb('aadhaar_data'),

    // Store the parsed data and PDF URL
    parsedData: jsonb('parsed_data'),
    aadhaarPdfUrl: text('aadhaar_pdf_url'),

    // Error message if verification fails
    errorMessage: text('error_message'),

    // Multi-tenant fields
    tenantId: uuid('tenant_id').notNull(),
    branchId: uuid('branch_id').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Ensure one verification per client_id (Surepass client_id)
    clientIdUnique: unique('client_id_unique').on(table.clientId),
    // Index for phone number lookups
    phoneNumberIdx: table.phoneNumber,
  })
);

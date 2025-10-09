import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  index,
} from 'drizzle-orm/pg-core';

export const RTOServiceTypeEnum = pgEnum('rto_service_type', [
  'NEW_DRIVING_LICENCE',
  'ADDITION_OF_CLASS',
  'LICENSE_RENEWAL',
  'DUPLICATE_LICENSE',
  'NAME_CHANGE',
  'ADDRESS_CHANGE',
  'INTERNATIONAL_PERMIT',
]);

export const RTOServiceStatusEnum = pgEnum('rto_service_status', [
  'PENDING',
  'DOCUMENT_COLLECTION',
  'APPLICATION_SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
  'CANCELLED',
]);

export const RTOServicePriorityEnum = pgEnum('rto_service_priority', ['NORMAL', 'TATKAL']);

export const RTOServicesTable = pgTable(
  'rto_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Client and branch relationship
    clientId: uuid('client_id').notNull(),
    paymentId: uuid('payment_id').unique(),
    branchId: uuid('branch_id').notNull(),

    // Service details
    serviceType: RTOServiceTypeEnum().notNull(),
    status: RTOServiceStatusEnum().default('PENDING').notNull(),

    // Application details
    applicationNumber: text('application_number'),

    // Fees breakdown
    governmentFees: integer('government_fees').notNull(),
    serviceCharge: integer('service_charge').notNull(),

    // Dates
    applicationDate: timestamp('application_date').defaultNow().notNull(),
    expectedCompletionDate: timestamp('expected_completion_date'),
    actualCompletionDate: timestamp('actual_completion_date'),

    // Additional details
    remarks: text('remarks'),
    requiredDocuments: text('required_documents'), // JSON string of document list
    submittedDocuments: text('submitted_documents'), // JSON string of submitted docs

    // Tracking
    trackingNumber: text('tracking_number'),
    agentAssigned: text('agent_assigned'),

    // Flags
    isDocumentCollectionComplete: boolean('is_document_collection_complete').default(false),
    isPaymentComplete: boolean('is_payment_complete').default(false),
    requiresClientPresence: boolean('requires_client_presence').default(false),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    // Dashboard performance indexes
    branchStatusIdx: index('idx_rto_services_branch_status').on(table.branchId, table.status),
    paymentIdx: index('idx_rto_services_payment').on(table.paymentId, table.branchId),
  })
);

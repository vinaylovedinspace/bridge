import { LicenseClassEnum } from '@/db/schema/enums';
import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core';

export const DrivingLicenseTable = pgTable('driving_licenses', {
  id: uuid('id').primaryKey().defaultRandom(),

  class: LicenseClassEnum('class').array(),

  appointmentDate: text('appointment_date'), // YYYY-MM-DD string to avoid timezone issues
  licenseNumber: text('license_number'),
  issueDate: text('issue_date'), // YYYY-MM-DD string to avoid timezone issues
  expiryDate: text('expiry_date'), // YYYY-MM-DD string to avoid timezone issues

  // test details
  applicationNumber: text('application_number'),
  testConductedBy: text('test_conducted_by'),
  imv: text('imv'),
  rto: text('rto'),
  department: text('department'),

  clientId: uuid('client_id').notNull().unique(),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

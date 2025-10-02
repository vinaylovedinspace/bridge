import { pgTable, text, timestamp, uuid, boolean, unique } from 'drizzle-orm/pg-core';
import { GenderEnum, BloodGroupEnum } from '../client/columns';

export const RTOClientTable = pgTable(
  'rto_clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientCode: text('client_code').notNull(),
    firstName: text('first_name').notNull(),
    middleName: text('middle_name'),
    lastName: text('last_name').notNull(),

    aadhaarNumber: text('aadhaar_number').notNull(),
    phoneNumber: text('phone_number').notNull(),
    email: text('email'),

    birthDate: text('birth_date').notNull(), // YYYY-MM-DD string to avoid timezone issues
    gender: GenderEnum().notNull(),

    // Additional personal information
    fatherName: text('father_name'),
    bloodGroup: BloodGroupEnum(),

    // Document information
    passportNumber: text('passport_number'),

    // Emergency contact
    emergencyContact: text('emergency_contact'),
    emergencyContactName: text('emergency_contact_name'),

    // Current address
    addressLine1: text('address_line_1').notNull(), // House/Door/Flat No
    addressLine2: text('address_line_2').notNull(), // Street/Locality/Police Station
    addressLine3: text('address_line_3'), // Location/Landmark
    city: text('city').notNull(),
    state: text('state').notNull(),
    pincode: text('pincode').notNull(),

    // Permanent address
    isCurrentAddressSameAsPermanentAddress: boolean(
      'is_current_address_same_as_permanent_address'
    ).default(true),
    permanentAddressLine1: text('permanent_address_line_1'), // House/Door/Flat No
    permanentAddressLine2: text('permanent_address_line_2'), // Street/Locality/Police Station
    permanentAddressLine3: text('permanent_address_line_3'), // Location/Landmark
    permanentCity: text('permanent_city'),
    permanentState: text('permanent_state'),
    permanentPincode: text('permanent_pincode'),

    branchId: uuid('branch_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    phoneNumberTenantUnique: unique('rto_client_phone_tenant_unique').on(
      table.phoneNumber,
      table.tenantId
    ),
    aadhaarTenantUnique: unique('rto_client_aadhaar_tenant_unique').on(
      table.aadhaarNumber,
      table.tenantId
    ),
  })
);

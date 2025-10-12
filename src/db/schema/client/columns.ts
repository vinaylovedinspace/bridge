import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  unique,
  index,
} from 'drizzle-orm/pg-core';

export const BloodGroupEnum = pgEnum('blood_group', [
  'A+',
  'B+',
  'AB+',
  'O+',
  'A-',
  'B-',
  'AB-',
  'O-',
]);
export const GenderEnum = pgEnum('gender', ['MALE', 'FEMALE', 'OTHER']);

export const CitizenStatusEnum = pgEnum('citizen_status', [
  'BIRTH',
  'NATURALIZED',
  'CITIZEN',
  'DESCENT',
  'REGISTRATION',
]);

export const EducationalQualificationEnum = pgEnum('educational_qualification', [
  'BELOW_10TH',
  'CLASS_10TH',
  'CLASS_12TH',
  'GRADUATE',
  'POST_GRADUATE',
  'OTHERS',
]);

export const GuardianRelationshipEnum = pgEnum('guardian_relationship', [
  'FATHER',
  'MOTHER',
  'HUSBAND',
  'GUARDIAN',
]);

export const ClientTable = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firstName: text('first_name').notNull(),
    middleName: text('middle_name'),
    lastName: text('last_name').notNull(),
    clientCode: text('client_code').notNull(),

    aadhaarNumber: text('aadhaar_number').notNull(),

    photoUrl: text('photo_url'),
    signatureUrl: text('signature_url'),

    guardianFirstName: text('guardian_first_name').notNull(),
    guardianMiddleName: text('guardian_middle_name'),
    guardianLastName: text('guardian_last_name').notNull(),
    guardianRelationship: GuardianRelationshipEnum().notNull().default('GUARDIAN'),

    birthDate: text('birth_date').notNull(), // YYYY-MM-DD string to avoid timezone issues
    bloodGroup: BloodGroupEnum().notNull(),
    gender: GenderEnum().notNull(),
    educationalQualification: EducationalQualificationEnum().notNull().default('CLASS_12TH'),

    phoneNumber: text('phone_number').notNull(),
    alternativePhoneNumber: text('alternative_phone_number'),
    email: text('email'),

    addressLine1: text('address_line_1').notNull(), // House/Door/Flat No
    addressLine2: text('address_line_2').notNull(), // Street/Locality/Police Station
    addressLine3: text('address_line_3'), // Location/Landmark
    city: text('city').notNull(),
    state: text('state').notNull(),
    pincode: text('pincode').notNull(),

    isCurrentAddressSameAsPermanentAddress: boolean(
      'is_current_address_same_as_permanent_address'
    ).default(false),

    permanentAddressLine1: text('permanent_address_line_1').notNull(), // House/Door/Flat No
    permanentAddressLine2: text('permanent_address_line_2').notNull(), // Street/Locality/Police Station
    permanentAddressLine3: text('permanent_address_line_3'), // Location/Landmark
    permanentCity: text('permanent_city').notNull(),
    permanentState: text('permanent_state').notNull(),
    permanentPincode: text('permanent_pincode').notNull(),

    citizenStatus: CitizenStatusEnum().default('BIRTH'),

    branchId: uuid('branch_id').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    tenantId: uuid('tenant_id').notNull(),
  },
  (table) => ({
    phoneNumberTenantUnique: unique('phone_number_tenant_unique').on(
      table.phoneNumber,
      table.tenantId
    ),
    aadhaarNumberTenantUnique: unique('aadhaar_number_tenant_unique').on(
      table.aadhaarNumber,
      table.tenantId
    ),
    // Dashboard performance index
    branchCreatedAtIdx: index('idx_clients_branch_created').on(table.branchId, table.createdAt),
    // Duplicate check performance indexes (composite with tenantId for scoped lookups)
    phoneNumberTenantIdx: index('idx_clients_phone_tenant').on(table.phoneNumber, table.tenantId),
    aadhaarNumberTenantIdx: index('idx_clients_aadhaar_tenant').on(
      table.aadhaarNumber,
      table.tenantId
    ),
  })
);

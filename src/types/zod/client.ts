import {
  ClientTable,
  BloodGroupEnum,
  GenderEnum,
  EducationalQualificationEnum,
  CitizenStatusEnum,
} from '@/db/schema';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const personalInfoSchema = createInsertSchema(ClientTable, {
  aadhaarNumber: z
    .string()
    .regex(/^[2-9]\d{3}\s?\d{4}\s?\d{4}$/, 'Aadhaar must be 12 digits starting with 2-9')
    .transform((val) => val.replace(/\s+/g, '')),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(12, 'Phone number must not exceed 12 digits')
    .regex(
      /^(\+?91)?[6-9]\d{9}$/,
      'Invalid phone number format. Use 10-digit number (e.g., 9876543210) or with country code (e.g., 919876543210)'
    ),
  email: z.string().email('Invalid email address').or(z.literal('')).optional().nullable(),

  birthDate: z.date().min(new Date('1900-01-01'), 'Invalid birth date'),
  bloodGroup: z.enum(BloodGroupEnum.enumValues, {
    required_error: 'Blood group is required',
  }),
  gender: z.enum(GenderEnum.enumValues, {
    required_error: 'Gender is required',
  }),
  educationalQualification: z.enum(EducationalQualificationEnum.enumValues, {
    required_error: 'Educational qualification is required',
  }),

  addressLine1: z.string().min(1, 'House/Door/Flat No is required'),
  addressLine2: z.string().min(1, 'Street/Locality/Police Station is required'),
  addressLine3: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().min(1, 'Pincode is required'),

  isCurrentAddressSameAsPermanentAddress: z.boolean().default(false),

  permanentAddressLine1: z.string().min(1, 'House/Door/Flat No is required'),
  permanentAddressLine2: z.string().min(1, 'Street/Locality/Police Station is required'),
  permanentAddressLine3: z.string().optional(),
  permanentCity: z.string().min(1, 'Permanent city is required'),
  permanentState: z.string().min(1, 'Permanent state is required'),
  permanentPincode: z.string().min(1, 'Permanent pincode is required'),

  citizenStatus: z.enum(CitizenStatusEnum.enumValues, {
    required_error: 'Citizen status is required',
  }),

  guardianFirstName: z.string().min(1, 'Guardian first name is required'),
  guardianLastName: z.string().min(1, 'Guardian last name is required'),

  photoUrl: z.string().optional(),

  // Make clientCode optional - it's auto-generated on create, preserved on update
  clientCode: z.string().optional(),
  id: z.string().optional(),
});

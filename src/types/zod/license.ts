import { LearningLicenseTable, LicenseClassEnum, DrivingLicenseTable } from '@/db/schema';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const learningLicenseSchema = createInsertSchema(LearningLicenseTable, {
  class: z
    .array(z.enum(LicenseClassEnum.enumValues))
    .min(1, 'At least one license class is required'),
  testConductedOn: z.date().min(new Date('1900-01-01'), 'Invalid test date').optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  issueDate: z.date().min(new Date('1900-01-01'), 'Invalid issue date').optional().nullable(),
  expiryDate: z.date().min(new Date('1900-01-01'), 'Invalid expiry date').optional().nullable(),
  applicationNumber: z.string().optional().nullable(),
  clientId: z.string().optional(), // Make clientId optional since it's added by the server action
  excludeLearningLicenseFee: z.boolean().optional().default(false),
});
export const drivingLicenseSchema = createInsertSchema(DrivingLicenseTable, {
  class: z
    .array(z.enum(LicenseClassEnum.enumValues))
    .min(1, 'At least one license class is required'),
  appointmentDate: z
    .date()
    .min(new Date('1900-01-01'), 'Invalid appointment date')
    .optional()
    .nullable(),
  licenseNumber: z.string().optional().nullable(),
  issueDate: z.date().min(new Date('1900-01-01'), 'Invalid issue date').optional().nullable(),
  expiryDate: z.date().min(new Date('1900-01-01'), 'Invalid expiry date').optional().nullable(),
  applicationNumber: z.string().optional().nullable(),
  testConductedBy: z.string().optional().nullable(),
  imv: z.string().optional().nullable(),
  rto: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  clientId: z.string().optional(), // Make clientId optional since it's added by the server action
});

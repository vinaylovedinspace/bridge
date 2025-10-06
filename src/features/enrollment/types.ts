import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { PlanTable, ServiceTypeEnum } from '@/db/schema/plan/columns';
import { isTimeWithinOperatingHours } from '@/lib/utils/date-utils';
import { personalInfoSchema } from '@/types/zod/client';
import { drivingLicenseSchema, learningLicenseSchema } from '@/types/zod/license';
import { paymentSchema } from '@/types/zod/payment';

// Base plan schema without operating hours validation
export const basePlanSchema = createInsertSchema(PlanTable, {
  vehicleId: z.string().min(1, 'Vehicle selection is required'),
  numberOfSessions: z.number().min(1, 'Number of sessions is required'),
  sessionDurationInMinutes: z.number().min(1, 'Session duration is required'),
  joiningDate: z.date().min(new Date('1900-01-01'), 'Invalid joining date'),
  serviceType: z.enum(ServiceTypeEnum.enumValues, {
    required_error: 'Service type is required',
  }),
}).omit({ createdAt: true, updatedAt: true });

// Function to create plan schema with operating hours validation
export const createPlanSchema = (operatingHours?: { start: string; end: string }) => {
  return basePlanSchema.extend({
    joiningDate: z
      .date()
      .min(new Date('1900-01-01'), 'Invalid joining date')
      .refine(
        (date) => {
          if (!operatingHours) return true; // No validation if no operating hours provided

          const hours = date.getHours();
          const minutes = date.getMinutes();

          return isTimeWithinOperatingHours(hours, minutes, operatingHours);
        },
        {
          message: `Selected time must be within operating hours (${operatingHours?.start || '00:00'} - ${operatingHours?.end || '23:59'})`,
        }
      ),
  });
};

export const planSchema = basePlanSchema.omit({
  planCode: true,
  branchId: true,
  vehicleRentAmount: true,
});

// Service type schema (separate from personal info for the first step)
export const serviceTypeSchema = z.object({
  serviceType: z.enum(ServiceTypeEnum.enumValues, {
    required_error: 'Service type is required',
  }),
});

// Function to create admission form schema with operating hours validation
export const createAdmissionFormSchema = (operatingHours?: { start: string; end: string }) => {
  return z.object({
    personalInfo: personalInfoSchema,
    learningLicense: learningLicenseSchema.optional(),
    drivingLicense: drivingLicenseSchema.optional(),
    plan: createPlanSchema(operatingHours),
    payment: paymentSchema,
  });
};

// Default admission form schema for backward compatibility
export const admissionFormSchema = z.object({
  serviceType: z.enum(ServiceTypeEnum.enumValues, {
    required_error: 'Service type is required',
  }),
  personalInfo: personalInfoSchema,
  learningLicense: learningLicenseSchema.optional(),
  drivingLicense: drivingLicenseSchema.optional(),
  plan: planSchema,
  payment: paymentSchema,
  // Store generated IDs in form state for better state management
  clientId: z.string().optional(),
  planId: z.string().optional(),
  paymentId: z.string().optional(),
});

export type ServiceTypeValues = z.infer<typeof serviceTypeSchema>;
export type PersonalInfoValues = z.infer<typeof personalInfoSchema>;
export type LearningLicenseValues = z.infer<typeof learningLicenseSchema>;
export type DrivingLicenseValues = z.infer<typeof drivingLicenseSchema>;
export type LicenseStepValues = LearningLicenseValues | DrivingLicenseValues;
export type PlanValues = z.infer<typeof planSchema>;
export type PaymentValues = z.infer<typeof paymentSchema>;
export type AdmissionFormValues = z.infer<typeof admissionFormSchema>;

export type AdmissionFormStepKey = 'service' | 'personal' | 'license' | 'plan' | 'payment';

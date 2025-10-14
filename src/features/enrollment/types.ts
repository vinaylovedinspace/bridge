import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { PlanTable, ServiceTypeEnum } from '@/db/schema/plan/columns';
import { isTimeWithinOperatingHours } from '@/lib/date-time-utils';
import { clientSchema } from '@/types/zod/client';
import { drivingLicenseSchema, learningLicenseSchema } from '@/types/zod/license';
import { paymentSchema } from '@/types/zod/payment';

// Base plan schema without operating hours validation
export const planSchema = createInsertSchema(PlanTable, {
  vehicleId: z.string().min(1, 'Vehicle selection is required'),
  numberOfSessions: z.number().min(1, 'Number of sessions is required'),
  sessionDurationInMinutes: z.number().min(1, 'Session duration is required'),
  joiningDate: z.date().min(new Date('1900-01-01'), 'Invalid joining date'),
  serviceType: z.enum(ServiceTypeEnum.enumValues, {
    required_error: 'Service type is required',
  }),
})
  .omit({ createdAt: true, updatedAt: true })
  .extend({
    paymentId: z.string().optional(),
    planCode: z.string().optional(),
  });

// Function to create plan schema with operating hours validation
export const createPlanSchema = (operatingHours?: { start: string; end: string }) => {
  return planSchema.extend({
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

// Service type schema (separate from personal info for the first step)
export const serviceTypeSchema = z.object({
  serviceType: z.enum(ServiceTypeEnum.enumValues, {
    required_error: 'Service type is required',
  }),
});

// Function to create admission form schema with operating hours validation
export const createAdmissionFormSchema = (operatingHours?: { start: string; end: string }) => {
  return z.object({
    client: clientSchema,
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
  client: clientSchema,
  learningLicense: learningLicenseSchema.optional(),
  drivingLicense: drivingLicenseSchema.optional(),
  plan: planSchema,
  payment: paymentSchema,
});

export type ServiceTypeValues = z.infer<typeof serviceTypeSchema>;
export type PersonalInfoValues = z.infer<typeof clientSchema>;
export type LearningLicenseValues = z.infer<typeof learningLicenseSchema>;
export type DrivingLicenseValues = z.infer<typeof drivingLicenseSchema>;
export type LicenseStepValues = LearningLicenseValues | DrivingLicenseValues;
export type PlanValues = z.infer<typeof planSchema>;
export type PaymentValues = z.infer<typeof paymentSchema>;
export type AdmissionFormValues = z.infer<typeof admissionFormSchema>;

export type AdmissionFormStepKey = 'service' | 'personal' | 'license' | 'plan' | 'payment';

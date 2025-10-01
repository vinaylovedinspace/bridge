import { personalInfoSchema } from '@/types/zod/client';
import { drivingLicenseSchema, learningLicenseSchema } from '@/types/zod/license';
import { z } from 'zod';

// Client Detail Form Schema
export const clientDetailFormSchema = z.object({
  personalInfo: personalInfoSchema,
  learningLicense: learningLicenseSchema.optional(),
  drivingLicense: drivingLicenseSchema.optional(),
});

export type ClientDetailFormValues = z.infer<typeof clientDetailFormSchema>;

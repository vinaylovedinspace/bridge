import { z } from 'zod';

export const branchSettingsSchema = z.object({
  workingDays: z.array(z.number().min(0).max(6)),
  operatingHours: z.object({
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  }),
  defaultRtoOffice: z.string().optional(),
  licenseServiceCharge: z.number().min(0).max(99999).optional(),
  digilockerFlowPreference: z.enum(['manager', 'client']).optional(),
});

export type BranchSettings = z.infer<typeof branchSettingsSchema>;

export interface OperatingHours {
  start: string;
  end: string;
}

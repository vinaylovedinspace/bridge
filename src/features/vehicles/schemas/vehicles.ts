import { z } from 'zod';

export const vehicleFormSchema = z.object({
  name: z.string(),
  number: z.string(),
  pucExpiry: z.date().nullable().optional(),
  insuranceExpiry: z.date().nullable().optional(),
  registrationExpiry: z.date().nullable().optional(),
  rent: z.number().positive('Rent must be greater than 0'),
});

import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { RTOServicesTable } from '@/db/schema';

const baseRtoServiceSchema = createInsertSchema(RTOServicesTable, {
  serviceType: z.enum([
    'LICENSE_RENEWAL',
    'ADDRESS_CHANGE',
    'DUPLICATE_LICENSE',
    'INTERNATIONAL_PERMIT',
    'NEW_LICENSE',
    'LEARNER_LICENSE',
    'CATEGORY_ADDITION',
    'LICENSE_TRANSFER',
    'NAME_CHANGE',
    'ENDORSEMENT_REMOVAL',
  ]),
  status: z
    .enum([
      'PENDING',
      'DOCUMENT_COLLECTION',
      'APPLICATION_SUBMITTED',
      'UNDER_REVIEW',
      'APPROVED',
      'REJECTED',
      'COMPLETED',
      'CANCELLED',
    ])
    .default('PENDING'),
  priority: z.enum(['NORMAL', 'TATKAL']).default('NORMAL'),
  rtoOffice: z.string().min(1, 'RTO office is required'),
  governmentFees: z.number().positive('Government fees must be positive'),
  serviceCharge: z.number().positive('Service charge must be positive'),
  urgentFees: z.number().min(0, 'Urgent fees cannot be negative').default(0),
  totalAmount: z.number().positive('Total amount must be positive'),
  existingLicenseNumber: z.string().min(1, 'License number is required'),
  applicationNumber: z.string().optional(),
  expectedCompletionDate: z.date().optional(),
  actualCompletionDate: z.date().optional(),
  remarks: z.string().optional(),
  trackingNumber: z.string().optional(),
  agentAssigned: z.string().optional(),
  requiredDocuments: z.string().optional(),
  submittedDocuments: z.string().optional(),
  isDocumentCollectionComplete: z.boolean().default(false),
  isPaymentComplete: z.boolean().default(false),
  requiresClientPresence: z.boolean().default(false),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true,
  branchId: true,
  rtoClientId: true,
});

export const rtoServiceSchema = baseRtoServiceSchema.refine(
  (data) => {
    // Calculate total amount validation
    const calculatedTotal = data.governmentFees + data.serviceCharge + (data.urgentFees || 0);
    return data.totalAmount === calculatedTotal;
  },
  {
    message: 'Total amount must equal government fees + service charge + urgent fees',
    path: ['totalAmount'],
  }
);

export const rtoServiceFormSchema = baseRtoServiceSchema
  .extend({
    // Client information (always new client)
    clientInfo: z.object({
      firstName: z.string().min(1, 'First name is required'),
      middleName: z.string().optional(),
      lastName: z.string().min(1, 'Last name is required'),
      aadhaarNumber: z.string().regex(/^\d{12}$/, 'Aadhaar number must be 12 digits'),
      phoneNumber: z
        .string()
        .min(10, 'Phone number is required')
        .max(15, 'Phone number is not valid')
        .regex(
          /^(\+91|91)?[6-9]\d{9}$/,
          'Invalid phone number format. Use 10-digit Indian number or include country code'
        ),
      email: z.string().email('Invalid email').optional().or(z.literal('')),
      addressLine1: z.string().min(1, 'House/Door/Flat No is required'),
      addressLine2: z.string().min(1, 'Street/Locality/Police Station is required'),
      addressLine3: z.string().optional(),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
      birthDate: z.date(),
      gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
      // Additional personal information
      fatherName: z.string().optional(),
      bloodGroup: z.enum(['A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-']).optional(),
      // Document information
      passportNumber: z.string().optional(),
      // Emergency contact
      emergencyContact: z.string().optional(),
      emergencyContactName: z.string().optional(),
      // Permanent address fields
      isCurrentAddressSameAsPermanentAddress: z.boolean().default(true),
      permanentAddressLine1: z.string().optional(),
      permanentAddressLine2: z.string().optional(),
      permanentAddressLine3: z.string().optional(),
      permanentCity: z.string().optional(),
      permanentState: z.string().optional(),
      permanentPincode: z.string().optional(),
    }),
  })
  .refine(
    (data) => {
      // Calculate total amount validation
      const calculatedTotal = data.governmentFees + data.serviceCharge + (data.urgentFees || 0);
      return data.totalAmount === calculatedTotal;
    },
    {
      message: 'Total amount must equal government fees + service charge + urgent fees',
      path: ['totalAmount'],
    }
  )
  .refine(
    (data) => {
      // If permanent address checkbox is false, permanent address fields are required
      if (!data.clientInfo.isCurrentAddressSameAsPermanentAddress) {
        return (
          data.clientInfo.permanentAddressLine1 &&
          data.clientInfo.permanentAddressLine2 &&
          data.clientInfo.permanentCity &&
          data.clientInfo.permanentState &&
          data.clientInfo.permanentPincode
        );
      }
      return true;
    },
    {
      message: 'Permanent address fields are required when different from current address',
      path: ['clientInfo', 'permanentAddressLine1'],
    }
  );

export type RTOServiceFormData = z.infer<typeof rtoServiceFormSchema>;
export type RTOServiceData = z.infer<typeof rtoServiceSchema>;

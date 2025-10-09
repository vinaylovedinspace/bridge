import { RTOServiceTypeEnum, type RTOServicesTable } from '@/db/schema';
import { RTO_OFFICES as _RTO_OFFICES } from '@/lib/constants/rto-offices';
import { personalInfoSchema } from '@/types/zod/client';
import { drivingLicenseSchema } from '@/types/zod/license';
import { paymentSchema } from '@/types/zod/payment';
import { z } from 'zod';

export type RTOService = typeof RTOServicesTable.$inferSelect;
export type RTOServiceInsert = typeof RTOServicesTable.$inferInsert;

export type RTOServiceStatus = RTOService['status'];
export type RTOServiceType = RTOService['serviceType'];

export const RTO_SERVICE_TYPE_LABELS: Record<RTOServiceType, string> = {
  NEW_DRIVING_LICENCE: 'New Driving Licence',
  LICENSE_RENEWAL: 'License Renewal',
  ADDRESS_CHANGE: 'Address Change',
  DUPLICATE_LICENSE: 'Duplicate Licence',
  INTERNATIONAL_PERMIT: 'International Permit',
  NAME_CHANGE: 'Name Change',
  ADDITION_OF_CLASS: 'Addition of Class',
};

export const RTO_SERVICE_STATUS_LABELS: Record<RTOServiceStatus, string> = {
  PENDING: 'Pending',
  DOCUMENT_COLLECTION: 'Document Collection',
  APPLICATION_SUBMITTED: 'Application Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const RTO_OFFICES = _RTO_OFFICES;
export type RTOOffice = (typeof RTO_OFFICES)[number];

export const rtoServicesFormSchema = z.object({
  clientId: z.string().optional(),
  serviceId: z.string().optional(),
  personalInfo: personalInfoSchema.extend({
    branchId: z.string().optional(),
    tenantId: z.string().optional(),
  }),
  service: z.object({
    type: z.enum(RTOServiceTypeEnum.enumValues, {
      required_error: 'Service type is required',
      invalid_type_error: 'Service type is required',
    }),
    license: drivingLicenseSchema.pick({
      licenseNumber: true,
      issueDate: true,
      expiryDate: true,
    }),
  }),
  payment: paymentSchema,
});

export const rtoServicesFormSchemaWithOptionalPayment = rtoServicesFormSchema.pick({
  personalInfo: true,
  service: true,
  serviceId: true,
  clientId: true,
});

export type RTOServiceFormValues = z.infer<typeof rtoServicesFormSchema>;

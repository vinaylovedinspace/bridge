import { Path } from 'react-hook-form';
import { RTOServiceFormValues } from '../types';
import { generateFieldPaths } from '@/lib/utils';
import { getRTOService } from '../server/db';
import { DEFAULT_STATE } from '@/lib/constants/business';

// Function to get validation fields for a specific step
export const getMultistepRTOServiceStepValidationFields = (
  step: string,
  getValues: (key: string) => unknown
): Path<RTOServiceFormValues>[] => {
  switch (step) {
    case 'personal':
      return generateFieldPaths<RTOServiceFormValues>({
        prefix: 'client',
        getValues,
      });
    case 'license':
      return generateFieldPaths<RTOServiceFormValues>({
        prefix: 'service',
        getValues,
      });
    default:
      return [];
  }
};

// Helper function to map client data to personal info form values
export const mapClientToPersonalInfo = (
  client: NonNullable<NonNullable<Awaited<ReturnType<typeof getRTOService>>>['client']>
): RTOServiceFormValues['client'] => {
  return {
    clientCode: client.clientCode,
    firstName: client.firstName,
    lastName: client.lastName,
    middleName: client.middleName || '',
    email: client.email || '',
    phoneNumber: client.phoneNumber,
    alternativePhoneNumber: client.alternativePhoneNumber || '',
    aadhaarNumber: client.aadhaarNumber,
    birthDate: new Date(client.birthDate),
    guardianFirstName: client.guardianFirstName,
    guardianLastName: client.guardianLastName,
    guardianMiddleName: client.guardianMiddleName || '',
    guardianRelationship: client.guardianRelationship,
    bloodGroup: client.bloodGroup,
    gender: client.gender,
    educationalQualification: client.educationalQualification,
    citizenStatus: client.citizenStatus || 'BIRTH',
    addressLine1: client.addressLine1,
    addressLine2: client.addressLine2,
    addressLine3: client.addressLine3 || '',
    city: client.city,
    state: client.state,
    pincode: client.pincode,
    isCurrentAddressSameAsPermanentAddress: client.isCurrentAddressSameAsPermanentAddress ?? false,
    permanentAddressLine1: client.permanentAddressLine1,
    permanentAddressLine2: client.permanentAddressLine2,
    permanentAddressLine3: client.permanentAddressLine3 || '',
    permanentCity: client.permanentCity,
    permanentState: client.permanentState,
    permanentPincode: client.permanentPincode,
    photoUrl: client.photoUrl || undefined,
    branchId: client.branchId,
    tenantId: client.tenantId,
  };
};

// Helper function to map RTO service to service form values
export const mapRTOServiceToServiceInfo = (
  rtoService: NonNullable<Awaited<ReturnType<typeof getRTOService>>>
): RTOServiceFormValues['service'] => {
  return {
    type: rtoService.serviceType,
    license: {
      licenseNumber: rtoService.client?.drivingLicense?.licenseNumber,
      issueDate: rtoService.client?.drivingLicense?.issueDate
        ? new Date(rtoService.client?.drivingLicense?.issueDate)
        : null,
      expiryDate: rtoService.client?.drivingLicense?.expiryDate
        ? new Date(rtoService.client?.drivingLicense?.expiryDate)
        : null,
    },
  };
};

// Helper function to get default values for RTO service form
export const getDefaultValuesForRTOServiceForm = (
  rtoService?: Awaited<ReturnType<typeof getRTOService>>
): Partial<RTOServiceFormValues> => {
  if (rtoService?.client) {
    return {
      clientId: rtoService.clientId,
      serviceId: rtoService.id,
      client: mapClientToPersonalInfo(rtoService.client),
      service: mapRTOServiceToServiceInfo(rtoService),
      payment: rtoService.payment
        ? {
            discount: rtoService.payment.discount,
            paymentType: rtoService.payment.paymentType || 'FULL_PAYMENT',
            paymentStatus: rtoService.payment.paymentStatus || 'PENDING',
            licenseServiceFee: rtoService.payment.licenseServiceFee,
            totalAmount: rtoService.payment.totalAmount,
            clientId: rtoService.payment.clientId,
            branchId: rtoService.payment.branchId,
            paymentMode: 'PAYMENT_LINK' as const,
            applyDiscount: rtoService.payment.discount > 0,
          }
        : {
            discount: 0,
            paymentType: 'FULL_PAYMENT' as const,
            paymentStatus: 'PENDING' as const,
            licenseServiceFee: 0,
            totalAmount: 0,
            clientId: rtoService.clientId,
            branchId: rtoService.branchId,
            paymentMode: 'PAYMENT_LINK' as const,
            applyDiscount: false,
          },
    };
  }

  return {
    client: {
      educationalQualification: 'GRADUATE',
      citizenStatus: 'BIRTH',
      isCurrentAddressSameAsPermanentAddress: false,
      state: DEFAULT_STATE,
      permanentState: DEFAULT_STATE,
    },
    service: {
      type: 'NEW_DRIVING_LICENCE',
      license: {},
    },
    payment: {
      discount: 0,
      paymentType: 'FULL_PAYMENT' as const,
      paymentStatus: 'PENDING' as const,
      licenseServiceFee: 0,
      totalAmount: 0,
      paymentMode: 'PAYMENT_LINK' as const,
      applyDiscount: false,
    },
  } as Partial<RTOServiceFormValues>;
};

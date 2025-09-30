import { Path } from 'react-hook-form';
import { AdmissionFormValues } from '../types';

// Helper function to generate field paths from type
const generateFieldPaths = ({
  prefix,
  excludeFields = [],
  getValues,
}: {
  prefix: keyof AdmissionFormValues;
  excludeFields?: string[];
  getValues: (key: string) => unknown;
}): Path<AdmissionFormValues>[] => {
  // Get the value for the specified prefix and safely handle undefined
  const value = getValues(prefix);
  const fields = value ? Object.keys(value) : [];

  return fields
    .filter((field) => !excludeFields.includes(field))
    .map((field) => `${String(prefix)}.${field}` as Path<AdmissionFormValues>);
};

// Function to get validation fields for a specific step
export const getMultistepAdmissionStepValidationFields = (
  step: string,
  getValues: (key: string) => unknown
): Path<AdmissionFormValues>[] => {
  switch (step) {
    case 'service':
      return ['personalInfo.serviceType'];
    case 'personal':
      return generateFieldPaths({
        prefix: 'personalInfo',
        getValues,
      });
    case 'license':
      return [
        ...generateFieldPaths({
          prefix: 'learningLicense',
          getValues,
        }),
        ...generateFieldPaths({
          prefix: 'learningLicense',
          getValues,
        }),
      ];
    case 'plan':
      return generateFieldPaths({
        prefix: 'plan',
        getValues,
      });
    case 'payment':
      return generateFieldPaths({
        prefix: 'payment',
        getValues,
      });
    default:
      return [];
  }
};

import { z } from 'zod';
import { admissionFormSchema } from '@/features/admission/types';
import { ClientDetail } from '@/server/db/client';

export type ClientFormValues = z.infer<typeof admissionFormSchema>;

// Helper function to convert date string to Date object
const parseDate = (dateString: string | null): Date | null => {
  if (!dateString) return null;
  return new Date(dateString);
};

// Helper function to combine date and time strings into a single Date object
const combineDateAndTime = (dateString: string, timeString: string): Date => {
  const date = new Date(dateString);
  const [hours, minutes] = timeString.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const transformClientToFormData = (client: NonNullable<ClientDetail>): ClientFormValues => {
  const { learningLicense, drivingLicense, plan, ...clientData } = client;

  // Get the first (active) plan if available
  const activePlan = plan && plan.length > 0 ? plan[0] : null;

  return {
    personalInfo: {
      firstName: clientData.firstName,
      lastName: clientData.lastName,
      clientCode: clientData.clientCode,
      aadhaarNumber: clientData.aadhaarNumber,
      guardianFirstName: clientData.guardianFirstName || '',
      guardianLastName: clientData.guardianLastName || '',
      birthDate: new Date(clientData.birthDate),
      bloodGroup: clientData.bloodGroup,
      gender: clientData.gender,
      educationalQualification: clientData.educationalQualification || 'CLASS_12TH',
      phoneNumber: clientData.phoneNumber,
      address: clientData.address,
      city: clientData.city,
      state: clientData.state,
      pincode: clientData.pincode,
      isCurrentAddressSameAsPermanentAddress:
        clientData.isCurrentAddressSameAsPermanentAddress ?? false,
      permanentAddress: clientData.permanentAddress,
      permanentCity: clientData.permanentCity,
      permanentState: clientData.permanentState,
      permanentPincode: clientData.permanentPincode,
      citizenStatus: clientData.citizenStatus || 'BIRTH',
      serviceType: clientData.serviceType,
      branchId: clientData.branchId,
      tenantId: clientData.tenantId,
      middleName: clientData.middleName || '',
      email: clientData.email || '',
      photoUrl: clientData.photoUrl || undefined,
    },
    learningLicense: learningLicense
      ? {
          class: learningLicense.class || [],
          testConductedOn: parseDate(learningLicense.testConductedOn),
          licenseNumber: learningLicense.licenseNumber,
          issueDate: parseDate(learningLicense.issueDate),
          expiryDate: parseDate(learningLicense.expiryDate),
          applicationNumber: learningLicense.applicationNumber,
        }
      : undefined,
    drivingLicense: drivingLicense
      ? {
          class: drivingLicense.class || [],
          appointmentDate: parseDate(drivingLicense.appointmentDate),
          licenseNumber: drivingLicense.licenseNumber,
          issueDate: parseDate(drivingLicense.issueDate),
          expiryDate: parseDate(drivingLicense.expiryDate),
          applicationNumber: drivingLicense.applicationNumber,
          testConductedBy: drivingLicense.testConductedBy,
          imv: drivingLicense.imv,
          rto: drivingLicense.rto,
          department: drivingLicense.department,
        }
      : undefined,
    plan: activePlan
      ? {
          vehicleId: activePlan.vehicleId,
          numberOfSessions: activePlan.numberOfSessions,
          sessionDurationInMinutes: activePlan.sessionDurationInMinutes,
          joiningDate: combineDateAndTime(activePlan.joiningDate, activePlan.joiningTime),
          joiningTime: activePlan.joiningTime,
          clientId: activePlan.clientId,
        }
      : {
          vehicleId: '',
          numberOfSessions: 21,
          sessionDurationInMinutes: 30,
          joiningDate: new Date(new Date().setHours(12, 0, 0, 0)),
          joiningTime: '09:00',
          clientId: client.id,
        },
    payment: activePlan?.payment
      ? {
          discount: activePlan.payment.discount,
          vehicleRentAmount: activePlan.payment.vehicleRentAmount,
          paymentType: activePlan.payment.paymentType || 'FULL_PAYMENT',
          paymentStatus: activePlan.payment.paymentStatus || 'PENDING',
          licenseServiceFee: activePlan.payment.licenseServiceFee,
          originalAmount: activePlan.payment.originalAmount,
          finalAmount: activePlan.payment.finalAmount,
          clientId: activePlan.payment.clientId,
          planId: activePlan.payment.planId,
        }
      : {
          discount: 0,
          vehicleRentAmount: 0,
          paymentType: 'FULL_PAYMENT' as const,
          paymentStatus: 'PENDING' as const,
          licenseServiceFee: 0,
          originalAmount: 0,
          finalAmount: 0,
          clientId: client.id,
          planId: '',
        },
    clientId: client.id,
    planId: activePlan?.id,
    paymentId: activePlan?.payment?.id,
  };
};

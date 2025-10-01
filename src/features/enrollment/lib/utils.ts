import { Path } from 'react-hook-form';
import { AdmissionFormValues } from '../types';
import { Enrollment } from '@/server/db/plan';

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
      return ['serviceType'];
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

export const transformClientToFormData = (
  enrollment: NonNullable<Enrollment>
): AdmissionFormValues => {
  const { client, payment } = enrollment;
  const learningLicense = client?.learningLicense;
  const drivingLicense = client?.drivingLicense;

  return {
    serviceType: enrollment.serviceType,
    personalInfo: {
      firstName: client.firstName,
      lastName: client.lastName,
      aadhaarNumber: client.aadhaarNumber,
      guardianFirstName: client.guardianFirstName || '',
      guardianLastName: client.guardianLastName || '',
      birthDate: new Date(client.birthDate),
      bloodGroup: client.bloodGroup,
      gender: client.gender,
      educationalQualification: client.educationalQualification || 'CLASS_12TH',
      phoneNumber: client.phoneNumber,
      address: client.address,
      city: client.city,
      state: client.state,
      pincode: client.pincode,
      isCurrentAddressSameAsPermanentAddress:
        client.isCurrentAddressSameAsPermanentAddress ?? false,
      permanentAddress: client.permanentAddress,
      permanentCity: client.permanentCity,
      permanentState: client.permanentState,
      permanentPincode: client.permanentPincode,
      citizenStatus: client.citizenStatus || 'BIRTH',
      branchId: client.branchId,
      tenantId: client.tenantId,
      middleName: client.middleName || '',
      email: client.email || '',
      photoUrl: client.photoUrl || undefined,
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
    plan: {
      vehicleId: enrollment.vehicleId,
      numberOfSessions: enrollment.numberOfSessions,
      sessionDurationInMinutes: enrollment.sessionDurationInMinutes,
      joiningDate: combineDateAndTime(enrollment.joiningDate, enrollment.joiningTime),
      joiningTime: enrollment.joiningTime,
      serviceType: enrollment.serviceType,
      clientId: enrollment.clientId,
    },
    payment: payment
      ? {
          discount: payment.discount,
          paymentType: payment.paymentType || 'FULL_PAYMENT',
          paymentStatus: payment.paymentStatus || 'PENDING',
          licenseServiceFee: payment.licenseServiceFee,
          originalAmount: payment.originalAmount,
          finalAmount: payment.finalAmount,
          clientId: payment.clientId,
          planId: payment.planId,
          paymentMode: 'PAYMENT_LINK' as const,
        }
      : {
          discount: 0,
          paymentType: 'FULL_PAYMENT' as const,
          paymentStatus: 'PENDING' as const,
          licenseServiceFee: 0,
          originalAmount: 0,
          finalAmount: 0,
          clientId: client.id,
          planId: enrollment.id,
          paymentMode: 'PAYMENT_LINK' as const,
        },
    clientId: client.id,
    planId: enrollment.id,
    paymentId: payment?.id,
  };
};

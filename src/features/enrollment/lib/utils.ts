import { Path } from 'react-hook-form';
import { AdmissionFormValues } from '../types';
import { Enrollment } from '@/server/db/plan';
import { generateFieldPaths } from '@/lib/utils';

// Function to get validation fields for a specific step
export const getMultistepAdmissionStepValidationFields = (
  step: string,
  getValues: (key: string) => unknown
): Path<AdmissionFormValues>[] => {
  switch (step) {
    case 'service':
      return ['serviceType'];
    case 'personal':
      return generateFieldPaths<AdmissionFormValues>({
        prefix: 'personalInfo',
        getValues,
      });
    case 'license':
      return [
        ...generateFieldPaths<AdmissionFormValues>({
          prefix: 'learningLicense',
          getValues,
        }),
        ...generateFieldPaths<AdmissionFormValues>({
          prefix: 'learningLicense',
          getValues,
        }),
      ];
    case 'plan':
      return generateFieldPaths<AdmissionFormValues>({
        prefix: 'plan',
        getValues,
      });
    case 'payment':
      return generateFieldPaths<AdmissionFormValues>({
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

// Helper function to map client data to personal info form values
export const mapClientToPersonalInfo = (
  client: NonNullable<Enrollment>['client']
): AdmissionFormValues['personalInfo'] => {
  return {
    firstName: client.firstName,
    lastName: client.lastName,
    aadhaarNumber: client.aadhaarNumber,
    guardianFirstName: client.guardianFirstName || '',
    guardianLastName: client.guardianLastName || '',
    guardianMiddleName: client.guardianMiddleName || '',
    guardianRelationship: client.guardianRelationship || 'FATHER',
    birthDate: new Date(client.birthDate),
    bloodGroup: client.bloodGroup,
    gender: client.gender,
    educationalQualification: client.educationalQualification || 'CLASS_12TH',
    phoneNumber: client.phoneNumber,
    alternativePhoneNumber: client.alternativePhoneNumber || '',
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
    citizenStatus: client.citizenStatus || 'BIRTH',
    branchId: client.branchId,
    tenantId: client.tenantId,
    middleName: client.middleName || '',
    email: client.email || '',
    photoUrl: client.photoUrl || undefined,
  };
};

// Helper function to map learning license to form values
export const mapLearningLicense = (
  learningLicense: NonNullable<Enrollment>['client']['learningLicense']
): AdmissionFormValues['learningLicense'] => {
  if (!learningLicense) return undefined;

  return {
    class: learningLicense.class || [],
    testConductedOn: parseDate(learningLicense.testConductedOn),
    licenseNumber: learningLicense.licenseNumber,
    issueDate: parseDate(learningLicense.issueDate),
    expiryDate: parseDate(learningLicense.expiryDate),
    applicationNumber: learningLicense.applicationNumber,
  };
};

// Helper function to map driving license to form values
export const mapDrivingLicense = (
  drivingLicense: NonNullable<Enrollment>['client']['drivingLicense']
): AdmissionFormValues['drivingLicense'] => {
  if (!drivingLicense) return undefined;

  return {
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
  };
};

export const getDefaultValuesForEnrollmentForm = (
  enrollment: NonNullable<Enrollment>
): AdmissionFormValues => {
  const { client, payment } = enrollment;

  return {
    serviceType: enrollment.serviceType,
    personalInfo: mapClientToPersonalInfo(client),
    learningLicense: mapLearningLicense(client?.learningLicense),
    drivingLicense: mapDrivingLicense(client?.drivingLicense),
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
          paymentMode: 'PAYMENT_LINK' as const,
        },
    clientId: client.id,
    planId: enrollment.id,
    paymentId: payment?.id,
  };
};

// Re-export payment utilities from centralized location
export { calculateOutstandingAmount, calculatePaymentBreakdown } from '@/lib/payment/calculate';

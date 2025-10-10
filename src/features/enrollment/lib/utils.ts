import { Path } from 'react-hook-form';
import { AdmissionFormValues } from '../types';
import { Enrollment } from '@/server/db/plan';
import { generateFieldPaths } from '@/lib/utils';
import { getClientById } from '../server/action';
import {
  DEFAULT_SESSION_DAYS,
  DEFAULT_SESSION_MINUTES,
  DEFAULT_STATE,
} from '@/lib/constants/business';
import { parseDateStringToDateObject } from '@/lib/date-time-utils';

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
        prefix: 'client',
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
): AdmissionFormValues['client'] => {
  return {
    id: client.id, // Include the client ID for edit mode
    clientCode: client.clientCode,
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
    testConductedOn: parseDateStringToDateObject(learningLicense.testConductedOn),
    licenseNumber: learningLicense.licenseNumber,
    issueDate: parseDateStringToDateObject(learningLicense.issueDate),
    expiryDate: parseDateStringToDateObject(learningLicense.expiryDate),
    applicationNumber: learningLicense.applicationNumber,
    excludeLearningLicenseFee: learningLicense.excludeLearningLicenseFee ?? false,
  };
};

// Helper function to map driving license to form values
export const mapDrivingLicense = (
  drivingLicense: NonNullable<Enrollment>['client']['drivingLicense']
): AdmissionFormValues['drivingLicense'] => {
  if (!drivingLicense) return undefined;

  return {
    class: drivingLicense.class || [],
    appointmentDate: parseDateStringToDateObject(drivingLicense.appointmentDate),
    licenseNumber: drivingLicense.licenseNumber,
    issueDate: parseDateStringToDateObject(drivingLicense.issueDate),
    expiryDate: parseDateStringToDateObject(drivingLicense.expiryDate),
    applicationNumber: drivingLicense.applicationNumber,
    testConductedBy: drivingLicense.testConductedBy,
    imv: drivingLicense.imv,
    rto: drivingLicense.rto,
    department: drivingLicense.department,
  };
};

const DEFAULT_PLAN_VALUES = {
  vehicleId: '',
  numberOfSessions: DEFAULT_SESSION_DAYS,
  sessionDurationInMinutes: DEFAULT_SESSION_MINUTES,
  joiningDate: new Date(),
  joiningTime: '12:00',
  serviceType: 'FULL_SERVICE' as const,
};

const DEFAULT_PAYMENT_VALUES = {
  discount: 0,
  paymentMode: 'PAYMENT_LINK' as const,
  applyDiscount: false,
};

export const getDefaultValuesForAddEnrollmentForm = (
  existingClient?: Awaited<ReturnType<typeof getClientById>>['data']
): AdmissionFormValues => {
  if (existingClient) {
    return {
      serviceType: 'FULL_SERVICE' as const,
      client: mapClientToPersonalInfo(existingClient),
      learningLicense: mapLearningLicense(existingClient.learningLicense),
      drivingLicense: mapDrivingLicense(existingClient.drivingLicense),
      plan: DEFAULT_PLAN_VALUES,
      payment: DEFAULT_PAYMENT_VALUES,
    } as AdmissionFormValues;
  }

  return {
    serviceType: 'FULL_SERVICE' as const,
    client: {
      educationalQualification: 'GRADUATE',
      citizenStatus: 'BIRTH',
      isCurrentAddressSameAsPermanentAddress: false,
      state: DEFAULT_STATE,
      permanentState: DEFAULT_STATE,
    },
    learningLicense: {},
    drivingLicense: {},
    plan: DEFAULT_PLAN_VALUES,
    payment: DEFAULT_PAYMENT_VALUES,
  } as AdmissionFormValues;
};

export const getDefaultValuesForEditEnrollmentForm = (
  enrollment: NonNullable<Enrollment>
): AdmissionFormValues => {
  const { client, payment } = enrollment;
  return {
    serviceType: enrollment.serviceType,
    client: mapClientToPersonalInfo(client),
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
          totalAmount: payment.totalAmount,
          clientId: payment.clientId,
          branchId: payment.branchId,
          paymentMode: 'PAYMENT_LINK' as const,
          applyDiscount: payment.discount > 0,
        }
      : {
          discount: 0,
          paymentType: 'FULL_PAYMENT' as const,
          paymentStatus: 'PENDING' as const,
          licenseServiceFee: 0,
          totalAmount: 0,
          clientId: client.id,
          branchId: client.branchId,
          paymentMode: 'PAYMENT_LINK' as const,
          applyDiscount: false,
        },
  };
};

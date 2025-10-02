import { Client } from '@/server/db/client';
import { ClientDetailFormValues } from '../types/client-detail';
import { parseDate } from '@/lib/date-utils';

export const transformClientToFormData = (client: NonNullable<Client>): ClientDetailFormValues => {
  return {
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
      addressLine1: client.addressLine1,
      addressLine2: client.addressLine2,
      addressLine3: client.addressLine3 || '',
      city: client.city,
      state: client.state,
      pincode: client.pincode,
      isCurrentAddressSameAsPermanentAddress:
        client.isCurrentAddressSameAsPermanentAddress ?? false,
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
    },
    learningLicense: client.learningLicense
      ? {
          class: client.learningLicense.class || [],
          testConductedOn: parseDate(client.learningLicense.testConductedOn),
          licenseNumber: client.learningLicense.licenseNumber,
          issueDate: parseDate(client.learningLicense.issueDate),
          expiryDate: parseDate(client.learningLicense.expiryDate),
          applicationNumber: client.learningLicense.applicationNumber,
        }
      : undefined,
    drivingLicense: client.drivingLicense
      ? {
          class: client.drivingLicense.class || [],
          appointmentDate: parseDate(client.drivingLicense.appointmentDate),
          licenseNumber: client.drivingLicense.licenseNumber,
          issueDate: parseDate(client.drivingLicense.issueDate),
          expiryDate: parseDate(client.drivingLicense.expiryDate),
          applicationNumber: client.drivingLicense.applicationNumber,
          testConductedBy: client.drivingLicense.testConductedBy,
          imv: client.drivingLicense.imv,
          rto: client.drivingLicense.rto,
          department: client.drivingLicense.department,
        }
      : undefined,
  };
};

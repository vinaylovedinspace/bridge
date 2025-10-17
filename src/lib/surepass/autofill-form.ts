import type { ParsedAadhaarData } from '@/types/surepass';
import type { UseFormSetValue, UseFormClearErrors } from 'react-hook-form';

/**
 * Autofills form fields with DigiLocker Aadhaar data
 * @param data - Parsed Aadhaar data from DigiLocker
 * @param aadhaarPdfUrl - Optional URL to the Aadhaar PDF document
 * @param setValue - React Hook Form setValue function
 * @param clearErrors - React Hook Form clearErrors function
 * @param options - Optional configuration (branchId, tenantId)
 */
export function autofillFormWithDigilockerData(
  data: ParsedAadhaarData,
  aadhaarPdfUrl: string | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clearErrors: UseFormClearErrors<any>
) {
  // Auto-fill form fields with Aadhaar data
  setValue('client.firstName', data.firstName);
  setValue('client.middleName', data.middleName || '');
  setValue('client.lastName', data.lastName);
  setValue('client.birthDate', data.birthDate);
  setValue('client.gender', data.gender);
  setValue('client.aadhaarNumber', data.aadhaarNumber || '');
  setValue('client.addressLine1', data.addressLine1);
  setValue('client.addressLine2', data.addressLine2);
  setValue('client.addressLine3', data.addressLine3 || '');
  setValue('client.city', data.city);
  setValue('client.state', data.state);
  setValue('client.pincode', data.pincode);
  setValue('client.permanentAddressLine1', data.permanentAddressLine1);
  setValue('client.permanentAddressLine2', data.permanentAddressLine2);
  setValue('client.permanentAddressLine3', data.permanentAddressLine3 || '');
  setValue('client.permanentCity', data.permanentCity);
  setValue('client.permanentState', data.permanentState);
  setValue('client.permanentPincode', data.permanentPincode);
  setValue('client.isCurrentAddressSameAsPermanentAddress', true);

  // Store the Aadhaar PDF URL if available
  if (aadhaarPdfUrl) {
    setValue('client.aadhaarPdfUrl', aadhaarPdfUrl);
  }

  // Set guardian information if available
  if (data.guardianFirstName) {
    setValue('client.guardianFirstName', data.guardianFirstName);
  }
  if (data.guardianMiddleName) {
    setValue('client.guardianMiddleName', data.guardianMiddleName);
  }
  if (data.guardianLastName) {
    setValue('client.guardianLastName', data.guardianLastName);
  }
  if (data.guardianRelationship) {
    setValue('client.guardianRelationship', data.guardianRelationship);
  }

  // Set photo URL if available
  if (data.photoUrl) {
    setValue('client.photoUrl', data.photoUrl);
  }

  // Clear any validation errors
  clearErrors();
}

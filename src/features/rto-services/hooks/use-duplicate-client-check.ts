import { useState } from 'react';
import { UseFormClearErrors, UseFormSetValue } from 'react-hook-form';

import { mapClientToPersonalInfo, mapDrivingLicense } from '@/features/enrollment/lib/utils';
import { checkPhoneNumberDuplicate, checkAadhaarNumberDuplicate } from '@/server/actions/clients';
import { RTOServiceFormValues } from '../types';

type ExistingClient = {
  id: string;
  name: string;
  matchedField: 'phone' | 'aadhaar';
  data: Awaited<ReturnType<typeof checkPhoneNumberDuplicate>>['client'];
};

export const useDuplicateClientCheck = (
  setValue: UseFormSetValue<RTOServiceFormValues>,
  clearErrors: UseFormClearErrors<RTOServiceFormValues>
) => {
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [existingClient, setExistingClient] = useState<ExistingClient | null>(null);

  const handlePhoneNumberBlur = async (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.length < 10) return;

    const result = await checkPhoneNumberDuplicate(phoneNumber);

    if (result.exists && result.client) {
      const fullName = [result.client.firstName, result.client.middleName, result.client.lastName]
        .filter(Boolean)
        .join(' ');

      setExistingClient({
        id: result.client.id,
        name: fullName,
        matchedField: 'phone',
        data: result.client,
      });
      setShowDuplicateModal(true);
    }
  };

  const handleAadhaarNumberBlur = async (aadhaarNumber: string) => {
    // Remove spaces and validate length (12 digits)
    const cleanedAadhaar = aadhaarNumber.replace(/\s/g, '');
    if (!cleanedAadhaar || cleanedAadhaar.length !== 12) return;

    const result = await checkAadhaarNumberDuplicate(cleanedAadhaar);

    if (result.exists && result.client) {
      const fullName = [result.client.firstName, result.client.middleName, result.client.lastName]
        .filter(Boolean)
        .join(' ');

      setExistingClient({
        id: result.client.id,
        name: fullName,
        matchedField: 'aadhaar',
        data: result.client,
      });
      setShowDuplicateModal(true);
    }
  };

  const handleUseExisting = () => {
    if (existingClient?.data) {
      // Fill the form with existing client data using the helper functions
      const client = mapClientToPersonalInfo(existingClient.data);
      const drivingLicense = mapDrivingLicense(existingClient.data.drivingLicense);

      setValue('client', client);
      setValue('client.id', existingClient.id);

      if (drivingLicense?.licenseNumber) {
        setValue('service.license.licenseNumber', drivingLicense.licenseNumber);
      }
      if (drivingLicense?.issueDate) {
        setValue('service.license.issueDate', drivingLicense.issueDate);
      }
      if (drivingLicense?.expiryDate) {
        setValue('service.license.expiryDate', drivingLicense.expiryDate);
      }
    }
    clearErrors();
    setShowDuplicateModal(false);
  };

  const handleContinueWithNew = () => {
    setShowDuplicateModal(false);
    setExistingClient(null);
  };

  return {
    showDuplicateModal,
    setShowDuplicateModal,
    existingClient,
    handlePhoneNumberBlur,
    handleAadhaarNumberBlur,
    handleUseExisting,
    handleContinueWithNew,
  };
};

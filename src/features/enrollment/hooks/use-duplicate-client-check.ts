import { useState } from 'react';
import { UseFormClearErrors, UseFormSetValue } from 'react-hook-form';

import {
  mapClientToPersonalInfo,
  mapLearningLicense,
  mapDrivingLicense,
} from '@/features/enrollment/lib/utils';
import { AdmissionFormValues } from '@/features/enrollment/types';
import { checkPhoneNumberDuplicate, checkAadhaarNumberDuplicate } from '@/server/actions/clients';

type ExistingClient = {
  id: string;
  name: string;
  matchedField: 'phone' | 'aadhaar';
  data: Awaited<ReturnType<typeof checkPhoneNumberDuplicate>>['client'];
};

export const useDuplicateClientCheck = (
  setValue: UseFormSetValue<AdmissionFormValues>,
  clearErrors: UseFormClearErrors<AdmissionFormValues>
) => {
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [existingClient, setExistingClient] = useState<ExistingClient | null>(null);

  const handlePhoneNumberBlur = async (phoneNumber: string) => {
    // Accept 10 digits (9876543210) or 12 digits (919876543210)
    if (!phoneNumber || phoneNumber.length < 10 || phoneNumber.length > 12) return;

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
      const personalInfo = mapClientToPersonalInfo(existingClient.data);
      const learningLicense = mapLearningLicense(existingClient.data.learningLicense);
      const drivingLicense = mapDrivingLicense(existingClient.data.drivingLicense);

      setValue('clientId', existingClient.data.id);
      setValue('personalInfo', personalInfo);

      if (learningLicense) {
        setValue('learningLicense', learningLicense);
      }

      if (drivingLicense) {
        setValue('drivingLicense', drivingLicense);
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

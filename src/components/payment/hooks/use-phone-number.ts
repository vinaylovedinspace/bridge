import { useState } from 'react';
import { toast } from 'sonner';

const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.trim());
};

export const usePhoneNumber = (initialPhone: string) => {
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [isEditing, setIsEditing] = useState(false);

  const savePhoneNumber = () => {
    const trimmedPhone = phoneNumber.trim();

    if (!trimmedPhone) {
      toast.error('Phone number is required');
      return false;
    }

    if (!isValidPhoneNumber(trimmedPhone)) {
      toast.error('Invalid phone number format. Must be 10 digits starting with 6-9');
      return false;
    }

    setPhoneNumber(trimmedPhone);
    setIsEditing(false);
    return true;
  };

  const isValid = isValidPhoneNumber(phoneNumber);

  return {
    phoneNumber,
    setPhoneNumber,
    isEditing,
    setIsEditing,
    savePhoneNumber,
    isValid,
  };
};

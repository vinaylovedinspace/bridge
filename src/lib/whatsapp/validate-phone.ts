export function isValidPhone(phone: string) {
  // Clean the phone number (remove spaces, dashes, etc.)
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

  const isValid = /^(\+91|91)?[6-9]\d{9}$/.test(cleanPhone);

  if (!isValid) {
    console.log('❌ [Phone Validation] Invalid phone:', phone);
    console.log('❌ [Phone Validation] Phone must be 10-15 digits, no special characters');
    console.log('❌ [Phone Validation] Example: 919876543210 (country code + number)');
  }

  return isValid;
}

export function formatPhoneForWhatsApp(phone: string): string {
  // Clean the phone number
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

  // If it's already in E.164 format (starts with country code), return as is
  if (/^91[6-9]\d{9}$/.test(cleanPhone)) {
    return cleanPhone;
  }

  // If it's a 10-digit Indian number, add country code
  if (/^[6-9]\d{9}$/.test(cleanPhone)) {
    return `91${cleanPhone}`;
  }

  // If it starts with +91, remove the + and return
  if (/^\+91[6-9]\d{9}$/.test(cleanPhone)) {
    return cleanPhone.substring(1);
  }

  throw new Error(`Invalid phone number format: ${phone}`);
}

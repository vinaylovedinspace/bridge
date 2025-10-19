/**
 * Phone number utilities for WhatsApp
 * Reusable functions for phone validation and formatting
 */

export function isValidPhone(phone: string): boolean {
  if (!phone) return false;

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Check if it's a valid Indian mobile number
  // Should be 10 digits starting with 6-9, or 11 digits starting with 91
  return /^([6-9]\d{9}|91[6-9]\d{9})$/.test(cleaned);
}

export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // If it's 10 digits, add country code
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `91${cleaned}`;
  }

  // If it's already 11 digits starting with 91, return as is
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  // Invalid format
  throw new Error(`Invalid phone number format: ${phone}`);
}

export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';

  const formatted = formatPhoneForWhatsApp(phone);

  // Format as +91 XXXXX XXXXX
  if (formatted.length === 12) {
    return `+${formatted.slice(0, 2)} ${formatted.slice(2, 7)} ${formatted.slice(7)}`;
  }

  return phone;
}

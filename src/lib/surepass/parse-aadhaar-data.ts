import type { AadhaarXmlData, ParsedAadhaarData } from '@/types/surepass';

/**
 * Parse Aadhaar XML data from Surepass Digilocker response to form fields
 */
export function parseAadhaarDataToFormFields(aadhaarXmlData: AadhaarXmlData): ParsedAadhaarData {
  // Parse name - split into first, middle, last
  const fullName = aadhaarXmlData.full_name || '';
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : undefined;

  // Parse date of birth (format: YYYY-MM-DD)
  const dobString = aadhaarXmlData.dob || '';
  let birthDate: Date;
  if (dobString) {
    birthDate = new Date(dobString);
  } else {
    birthDate = new Date();
  }

  // Parse gender
  const genderMap: Record<string, 'MALE' | 'FEMALE' | 'OTHER'> = {
    M: 'MALE',
    F: 'FEMALE',
    O: 'OTHER',
  };
  const gender = genderMap[aadhaarXmlData.gender || 'O'] || 'OTHER';

  // Parse address
  const address = aadhaarXmlData.address || {};
  const addressLine1 = address.house || '';
  const addressLine2 = [address.street, address.loc].filter(Boolean).join(', ') || '';
  const addressLine3 = address.landmark || undefined;
  const city = address.dist || address.vtc || '';
  const state = address.state || '';
  const pincode = aadhaarXmlData.zip || '';

  // Parse guardian name from care_of or father_name
  const guardianName = aadhaarXmlData.father_name || aadhaarXmlData.care_of || '';
  const guardianParts = guardianName.replace(/^(S\/O|D\/O|W\/O|C\/O):?\s*/i, '').trim().split(/\s+/);
  const guardianFirstName = guardianParts[0] || undefined;
  const guardianLastName =
    guardianParts.length > 1 ? guardianParts[guardianParts.length - 1] : undefined;
  const guardianMiddleName =
    guardianParts.length > 2 ? guardianParts.slice(1, -1).join(' ') : undefined;

  // Convert base64 profile image to data URL if available
  let photoUrl: string | undefined;
  if (aadhaarXmlData.profile_image) {
    photoUrl = `data:image/jpeg;base64,${aadhaarXmlData.profile_image}`;
  }

  return {
    firstName,
    middleName,
    lastName,
    birthDate,
    gender,
    aadhaarNumber: aadhaarXmlData.masked_aadhaar?.replace(/X/g, ''),
    addressLine1,
    addressLine2,
    addressLine3,
    city,
    state,
    pincode,
    // Set permanent address same as current address
    permanentAddressLine1: addressLine1,
    permanentAddressLine2: addressLine2,
    permanentAddressLine3: addressLine3,
    permanentCity: city,
    permanentState: state,
    permanentPincode: pincode,
    guardianFirstName,
    guardianMiddleName,
    guardianLastName,
    photoUrl,
  };
}

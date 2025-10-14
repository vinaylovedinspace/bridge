export type DigilockerInitializeRequest = {
  mobile: string;
  tenantId: string;
  branchId: string;
};

export type DigilockerInitializeResponse = {
  data?: {
    client_id: string;
    token: string;
    expiry_seconds: number;
  };
  status_code?: number;
  message_code?: string;
  message?: string;
  success: boolean;
  error?: string;
};

export type DigilockerStatusResponse = {
  data?: {
    error_description?: string | null;
    status: 'pending' | 'completed' | 'failed';
    completed: boolean;
    failed: boolean;
    aadhaar_linked: boolean;
  };
  status_code?: number;
  success: boolean;
  message?: string;
  message_code?: string;
  error?: string;
};

export type DigilockerListDocumentsResponse = {
  data?: {
    documents?: Array<{
      digi_file_id: string;
      name: string;
      type: string;
      size?: number;
      issued_on?: string;
      valid_until?: string;
      issuer?: string;
    }>;
  };
  status_code?: number;
  success: boolean;
  message?: string;
  message_code?: string;
  error?: string;
};

export type DigilockerDownloadDocumentResponse = {
  data?: {
    download_url: string;
    mime_type: string;
  };
  status_code?: number;
  success: boolean;
  message?: string;
  message_code?: string;
  error?: string;
};

export type AadhaarAddress = {
  country?: string;
  dist?: string;
  state?: string;
  po?: string;
  house?: string;
  loc?: string;
  vtc?: string;
  subdist?: string;
  street?: string;
  landmark?: string;
};

export type AadhaarXmlData = {
  full_name?: string;
  care_of?: string;
  dob?: string;
  yob?: string;
  zip?: string;
  profile_image?: string;
  gender?: 'M' | 'F' | 'O';
  masked_aadhaar?: string;
  full_address?: string;
  father_name?: string;
  address?: AadhaarAddress;
};

export type DigilockerMetadata = {
  name?: string;
  gender?: 'M' | 'F' | 'O';
  dob?: string;
};

export type DigilockerDownloadAadhaarResponse = {
  data?: {
    client_id?: string;
    digilocker_metadata?: DigilockerMetadata;
    aadhaar_xml_data?: AadhaarXmlData;
    xml_url?: string;
  };
  status_code?: number;
  success: boolean;
  message?: string;
  message_code?: string;
  error?: string;
};

export type ParsedAadhaarData = {
  firstName: string;
  middleName?: string;
  lastName: string;
  birthDate: Date;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  aadhaarNumber?: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3?: string;
  city: string;
  state: string;
  pincode: string;
  permanentAddressLine1: string;
  permanentAddressLine2: string;
  permanentAddressLine3?: string;
  permanentCity: string;
  permanentState: string;
  permanentPincode: string;
  guardianFirstName?: string;
  guardianMiddleName?: string;
  guardianLastName?: string;
  photoUrl?: string;
};

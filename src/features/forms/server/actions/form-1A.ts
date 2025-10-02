'use server';

import { getClient } from '@/server/db/client';
import { fillAndFlattenPdf } from '@/features/forms/lib/pdf-server-utils';

export const fillForm1A = async (clientId: string) => {
  try {
    // Fetch client data
    const client = await getClient(clientId);

    if (!client) {
      throw new Error('Client not found');
    }

    // Full name of the client
    const fullName = `${client.firstName}${client.middleName ? ' ' + client.middleName : ''} ${client.lastName}`;

    // Fill the PDF form
    const base64Pdf = await fillAndFlattenPdf('form-1A.pdf', (form) => {
      const applicantNameField = form.getTextField('name_of_the_applicant');
      applicantNameField.setText(fullName);
    });

    return {
      success: true,
      pdfData: base64Pdf,
      fileName: `${client.clientCode}-form-1a.pdf`,
    };
  } catch (error) {
    console.error('Error filling PDF:', error);
    return {
      success: false,
      error: 'Failed to fill PDF',
    };
  }
};

// licencing_authority_1
// licencing_authority_2

// issue_new_learners_licence
// issue_new_driving_licence
// addition_of_vehicle_class
// renewal_of_driving_licence
// duplicate_driving_licence
// change_address_in_driving_licence
// change_name_in_driving_license

// MCWOG
// MCWG
// LMV

// declaration_epilepsy_yes
// declaration_epilepsy_no
// declaration_eye_yes
// declaration_eye_no
// declaration_limbs_yes
// declaration_limbs_no
// declaration_night_blindness_yes
// declaration_night_blindness_no
// declaration_deaf_yes
// declaration_deaf_no

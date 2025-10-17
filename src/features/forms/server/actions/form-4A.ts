'use server';

import { getClient } from '@/server/db/client';
import { fillAndFlattenPdf } from '@/features/forms/lib/pdf-server-utils';
import { form4AFieldNames } from '@/features/forms/lib/field-names/form-4A';
import { getBranchConfigWithTenant } from '@/server/db/branch';
import { form4ABase64 } from '@/features/forms/lib/forms-base64/form-4A';

export const fillForm4A = async (clientId: string) => {
  try {
    // Fetch client data
    const _client = await getClient(clientId);

    if (!_client) {
      throw new Error('Client not found');
    }

    const branchConfig = await getBranchConfigWithTenant();
    const client = _client;

    const pdfBytes = Buffer.from(form4ABase64, 'base64');

    // Fill the PDF form
    const base64Pdf = await fillAndFlattenPdf(pdfBytes, (form) => {
      try {
        // License authority
        const rtoOffice = (branchConfig?.defaultRtoOffice as string).toUpperCase();
        const words = rtoOffice.split(' ');
        const midPoint = Math.ceil(words.length / 2);
        const line1 = words.slice(0, midPoint).join(' ');
        const line2 = words.slice(midPoint).join(' ');
        form.getTextField(form4AFieldNames.licence_authority_1).setText(line1);
        if (line2) {
          form.getTextField(form4AFieldNames.licence_authority_2).setText(line2);
        }

        // Name (surname, middle name, first name format)
        const fullName = `${client.lastName} ${client.middleName ? client.middleName + ' ' : ''}${client.firstName}`;
        form.getTextField(form4AFieldNames.surname_middlename_firstname).setText(fullName);

        // Guardian name
        const guardianFullName = `${client.guardianLastName} ${client.guardianMiddleName ? client.guardianMiddleName + ' ' : ''}${client.guardianFirstName}`;
        form.getTextField(form4AFieldNames.guardian_name).setText(guardianFullName);

        // Birth details
        form.getTextField(form4AFieldNames.birth_date).setText(client.birthDate);
        // form.getTextField(form4AFieldNames.place_of_birth_and_country).setText('INDIA');

        // Blood group and education
        form.getTextField(form4AFieldNames.blood_group).setText(client.bloodGroup);
        form
          .getTextField(form4AFieldNames.educational_qualification)
          .setText(client.educationalQualification);

        // Contact details
        form.getTextField(form4AFieldNames.mobile_number).setText(client.phoneNumber);
        if (client.email) {
          form.getTextField(form4AFieldNames.email_id).setText(client.email);
        }

        // Addresses
        const presentAddressParts = [client.addressLine1, client.pincode].filter(Boolean);
        form.getTextField(form4AFieldNames.present_address).setText(presentAddressParts.join(', '));

        const permanentAddressParts = [
          client.permanentAddressLine1,
          client.permanentPincode,
        ].filter(Boolean);
        form
          .getTextField(form4AFieldNames.permanent_address)
          .setText(permanentAddressParts.join(', '));

        // Default "No" answers for declaration fields
        form.getTextField(form4AFieldNames.ever_disqualified).setText('No');
        form.getTextField(form4AFieldNames.ever_barred_from_requesting_country).setText('No');
        form.getTextField(form4AFieldNames.fitness_subjected).setText('No');
        form.getTextField(form4AFieldNames.previously_held_idp).setText('No');
        form.getTextField(form4AFieldNames.conviction).setText('No');
      } catch (error) {
        console.log('Error filling form-4A:', error);
      }
    });

    console.log('base64Pdf', base64Pdf);
    return {
      success: true,
      pdfData: base64Pdf,
      fileName: `${client.clientCode}-form-4a.pdf`,
    };
  } catch (error) {
    console.error('Error filling PDF:', error);
    return {
      success: false,
      error: 'Failed to fill PDF',
    };
  }
};

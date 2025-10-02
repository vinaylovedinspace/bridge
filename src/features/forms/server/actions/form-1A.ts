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

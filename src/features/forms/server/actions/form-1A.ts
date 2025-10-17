'use server';

import { getClient } from '@/server/db/client';
import { fillAndFlattenPdf } from '@/features/forms/lib/pdf-server-utils';
import fs from 'fs';
import path from 'path';

export const fillForm1A = async (clientId: string) => {
  try {
    // Fetch client data
    const client = await getClient(clientId);

    if (!client) {
      throw new Error('Client not found');
    }

    // Full name of the client
    const fullName = `${client.firstName}${client.middleName ? ' ' + client.middleName : ''} ${client.lastName}`;

    const pdfPath = path.join(process.cwd(), 'src', 'assets', 'pdfs', 'form-1A.pdf');
    const pdfBytes = fs.readFileSync(pdfPath);

    // Fill the PDF form
    const base64Pdf = await fillAndFlattenPdf(pdfBytes, (form) => {
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

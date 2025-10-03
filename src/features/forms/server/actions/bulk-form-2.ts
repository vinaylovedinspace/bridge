'use server';

import { getClient } from '@/server/db/client';
import { mergePdfs, loadPdfWithForm } from '@/features/forms/lib/pdf-server-utils';
import { getEnrollmentByPlanId } from '@/server/db/plan';
import { getBranchConfigWithTenant } from '@/server/db/branch';
import { PDFDocument } from 'pdf-lib';
import { fillForm2Fields } from './form-2';

export const bulkFillForm2 = async (clientIds: string[]) => {
  try {
    const branchConfig = await getBranchConfigWithTenant();
    const pdfDocuments: PDFDocument[] = [];

    for (const clientId of clientIds) {
      const _client = await getClient(clientId);

      if (!_client) {
        console.error(`Client ${clientId} not found`);
        continue;
      }

      const latestPlan = _client.plan[0];
      if (!latestPlan) {
        console.error(`Plan not found for client ${clientId}`);
        continue;
      }

      const enrollment = await getEnrollmentByPlanId(latestPlan.id);
      if (!enrollment) {
        console.error(`Enrollment not found for plan ${latestPlan.id}`);
        continue;
      }

      // Load and fill PDF for this client
      const { pdfDoc, form } = await loadPdfWithForm('form-2.pdf');

      try {
        // Use the extracted helper to fill form fields
        await fillForm2Fields(form, enrollment, branchConfig);

        form.updateFieldAppearances();
        form.flatten();

        pdfDocuments.push(pdfDoc);
      } catch (error) {
        console.error(`Error filling PDF for client ${clientId}:`, error);
      }
    }

    if (pdfDocuments.length === 0) {
      return {
        success: false,
        error: 'No PDFs were generated',
      };
    }

    // Merge all PDFs
    const mergedPdf = await mergePdfs(pdfDocuments);

    return {
      success: true,
      pdfData: mergedPdf,
      fileName: `form-2-bulk-${clientIds.length}-clients.pdf`,
      count: pdfDocuments.length,
    };
  } catch (error) {
    console.error('Error in bulk fill form-2:', error);
    return {
      success: false,
      error: 'Failed to generate bulk PDFs',
    };
  }
};

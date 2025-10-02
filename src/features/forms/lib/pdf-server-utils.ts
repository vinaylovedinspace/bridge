/**
 * Server-side PDF utility functions
 * These utilities run on the server and help with loading and manipulating PDFs
 */

import { PDFDocument, PDFForm } from 'pdf-lib';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Loads a PDF template from the public directory
 * @param fileName - Name of the PDF file (e.g., 'form-1A.pdf')
 * @returns Loaded PDF document
 */
export async function loadPdfTemplate(fileName: string): Promise<PDFDocument> {
  const pdfPath = join(process.cwd(), 'public', fileName);
  const pdfBytes = await readFile(pdfPath);
  return PDFDocument.load(pdfBytes);
}

/**
 * Converts a PDF document to base64 string
 * @param pdfDoc - PDF document to convert
 * @returns Base64 encoded PDF
 */
export async function pdfToBase64(pdfDoc: PDFDocument): Promise<string> {
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes).toString('base64');
}

/**
 * Loads a PDF template and returns both the document and its form
 * @param fileName - Name of the PDF file (e.g., 'form-1A.pdf')
 * @returns Object containing the PDF document and form
 */
export async function loadPdfWithForm(
  fileName: string
): Promise<{ pdfDoc: PDFDocument; form: PDFForm }> {
  const pdfDoc = await loadPdfTemplate(fileName);
  const form = pdfDoc.getForm();
  return { pdfDoc, form };
}

/**
 * Helper to fill a PDF form, flatten it, and return as base64
 * @param fileName - Name of the PDF file
 * @param fillFunction - Function that fills the form fields
 * @returns Base64 encoded PDF
 */
export async function fillAndFlattenPdf(
  fileName: string,
  fillFunction: (form: PDFForm) => void
): Promise<string> {
  const { pdfDoc, form } = await loadPdfWithForm(fileName);

  // Fill the form fields
  fillFunction(form);

  // Update field appearances before flattening
  // This regenerates appearance streams for all fields including checkboxes
  form.updateFieldAppearances();

  // Note: Flattening is disabled because it causes checkboxes to disappear
  // The PDF will remain editable but all fields will be filled
  // To make it non-editable, you need to fix the PDF template's appearance streams
  form.flatten();

  // Convert to base64
  return pdfToBase64(pdfDoc);
}

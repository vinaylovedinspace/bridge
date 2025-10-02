/**
 * Utility functions for PDF manipulation
 */

/**
 * Converts a base64 string to a Blob
 * @param base64 - Base64 encoded string
 * @param mimeType - MIME type of the blob (default: 'application/pdf')
 * @returns Blob object
 */
export function base64ToBlob(base64: string, mimeType = 'application/pdf'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Downloads a blob as a file
 * @param blob - Blob to download
 * @param fileName - Name of the file to download
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Opens a blob in a new window for printing
 * @param blob - Blob to print
 */
export function printBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
      URL.revokeObjectURL(url);
    };
  } else {
    URL.revokeObjectURL(url);
    throw new Error('Failed to open print window. Please check popup blockers.');
  }
}

/**
 * Handles PDF download from base64 data
 * @param base64Data - Base64 encoded PDF data
 * @param fileName - Name of the file to download
 */
export function downloadPdfFromBase64(base64Data: string, fileName: string): void {
  const blob = base64ToBlob(base64Data);
  downloadBlob(blob, fileName);
}

/**
 * Handles PDF printing from base64 data
 * @param base64Data - Base64 encoded PDF data
 */
export function printPdfFromBase64(base64Data: string): void {
  const blob = base64ToBlob(base64Data);
  printBlob(blob);
}

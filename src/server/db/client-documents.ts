import { db } from '@/db';
import { ClientDocumentTable } from '@/db/schema';

export type InsertClientDocument = {
  url: string;
  name?: string;
  type: 'AADHAAR_CARD' | 'PAN_CARD';
  clientId: string;
};

/**
 * Insert a client document (Aadhaar, PAN, etc.)
 */
export async function insertClientDocument(document: InsertClientDocument) {
  const [clientDocument] = await db
    .insert(ClientDocumentTable)
    .values({
      url: document.url,
      name: document.name,
      type: document.type,
      clientId: document.clientId,
    })
    .returning();

  return clientDocument;
}

/**
 * Save Aadhaar PDF document for a client
 */
export async function saveAadhaarDocument(clientId: string, aadhaarPdfUrl: string) {
  return insertClientDocument({
    url: aadhaarPdfUrl,
    name: 'Aadhaar Card',
    type: 'AADHAAR_CARD',
    clientId,
  });
}

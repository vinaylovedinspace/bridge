import { z } from 'zod';

/**
 * Type-safe metadata schemas for transaction table
 * Consolidates gateway-specific data into structured JSONB
 */

// Gateway link data (for payment link transactions)
export const GatewayLinkDataSchema = z.object({
  linkId: z.string(),
  linkUrl: z.string().optional(),
  linkStatus: z.string().optional(),
  linkExpiresAt: z.string().optional(),
  linkCreatedAt: z.string().optional(),
  referenceId: z.string().optional(),
});

export type GatewayLinkData = z.infer<typeof GatewayLinkDataSchema>;

// Gateway response data (from webhook)
export const GatewayResponseDataSchema = z.object({
  txnId: z.string().optional(),
  bankTxnId: z.string().optional(),
  responseCode: z.string().optional(),
  responseMessage: z.string().optional(),
});

export type GatewayResponseData = z.infer<typeof GatewayResponseDataSchema>;

// Full transaction metadata structure
export const TransactionMetadataSchema = z.object({
  paymentType: z.enum(['FULL_PAYMENT', 'INSTALLMENTS']).optional(),
  type: z.enum(['enrollment', 'rto-service']).optional(),
  gateway: GatewayLinkDataSchema.optional(),
  response: GatewayResponseDataSchema.optional(),
  recordedAt: z.string().optional(), // For manual payments
});

export type TransactionMetadata = z.infer<typeof TransactionMetadataSchema>;

/**
 * Helper to build metadata for payment link transactions
 */
export function buildPaymentLinkMetadata(params: {
  paymentType: 'FULL_PAYMENT' | 'INSTALLMENTS';
  type: 'enrollment' | 'rto-service';
  linkId: string;
  linkUrl?: string;
  linkStatus?: string;
  linkExpiresAt?: Date | null;
  linkCreatedAt?: Date;
  referenceId?: string;
}): TransactionMetadata {
  return {
    paymentType: params.paymentType,
    type: params.type,
    gateway: {
      linkId: params.linkId,
      linkUrl: params.linkUrl,
      linkStatus: params.linkStatus,
      linkExpiresAt: params.linkExpiresAt?.toISOString(),
      linkCreatedAt: params.linkCreatedAt?.toISOString(),
      referenceId: params.referenceId,
    },
  };
}

/**
 * Helper to build metadata for manual payments
 */
export function buildManualPaymentMetadata(params: {
  paymentType?: 'FULL_PAYMENT' | 'INSTALLMENTS';
  type?: 'enrollment' | 'rto-service';
}): TransactionMetadata {
  return {
    paymentType: params.paymentType,
    type: params.type,
    recordedAt: new Date().toISOString(),
  };
}

/**
 * Helper to update metadata with gateway response
 */
export function setGatewayResponse(
  metadata: unknown,
  response: GatewayResponseData
): TransactionMetadata {
  const existing = TransactionMetadataSchema.parse(metadata || {});
  return {
    ...existing,
    response: {
      ...existing.response,
      ...response,
    },
  };
}

/**
 * Helper to get gateway link ID from metadata
 */
export function getGatewayLinkId(metadata: unknown): string | null {
  try {
    const parsed = TransactionMetadataSchema.parse(metadata);
    return parsed.gateway?.linkId ?? null;
  } catch {
    return null;
  }
}

/**
 * Helper to get gateway reference ID from metadata
 */
export function getGatewayReferenceId(metadata: unknown): string | null {
  try {
    const parsed = TransactionMetadataSchema.parse(metadata);
    return parsed.gateway?.referenceId ?? null;
  } catch {
    return null;
  }
}

/**
 * Helper to get payment type from metadata
 */
export function getPaymentType(metadata: unknown): 'FULL_PAYMENT' | 'INSTALLMENTS' | null {
  try {
    const parsed = TransactionMetadataSchema.parse(metadata);
    return parsed.paymentType ?? null;
  } catch {
    return null;
  }
}

/**
 * Helper to get gateway transaction ID from metadata
 */
export function getGatewayTxnId(metadata: unknown): string | null {
  try {
    const parsed = TransactionMetadataSchema.parse(metadata);
    return parsed.response?.txnId ?? null;
  } catch {
    return null;
  }
}

/**
 * Helper to update link status in metadata
 */
export function setLinkStatus(metadata: unknown, status: string): TransactionMetadata {
  const existing = TransactionMetadataSchema.parse(metadata || {});
  return {
    ...existing,
    gateway: {
      ...existing.gateway,
      linkId: existing.gateway?.linkId ?? '',
      linkStatus: status,
    },
  };
}

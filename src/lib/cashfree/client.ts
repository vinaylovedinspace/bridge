import { z } from 'zod';
import { env } from '@/env';

export type PaymentLinkResponse = {
  cf_link_id: number;
  link_id: string;
  link_status: 'ACTIVE' | 'INACTIVE' | 'PAID' | 'EXPIRED';
  link_currency: string;
  link_amount: number;
  link_amount_paid: number;
  link_partial_payments: boolean;
  link_minimum_partial_amount?: number;
  link_purpose: string;
  link_created_at: string;
  link_expiry_time?: string;
  customer_details: {
    customer_name?: string;
    customer_email?: string;
    customer_phone: string;
  };
  link_meta?: {
    return_url?: string;
    notify_url?: string;
    payment_methods?: string;
  };
  link_url: string;
  link_qrcode: string;
  link_auto_reminders: boolean;
  link_notify: {
    send_sms: boolean;
    send_email: boolean;
  };
};

// Validation schema for create payment link body
const createPaymentLinkParamsSchema = z.object({
  link_id: z.string().min(1),
  link_purpose: z.string(),
  link_amount: z.number().positive(),
  link_currency: z.string().default('INR'),
  link_notify: z.object({
    send_sms: z.boolean().default(true),
  }),
  link_notes: z.record(z.string()).optional(),
  link_meta: z
    .object({
      notify_url: z.string().url().optional(),
      return_url: z.string().url().optional(),
    })
    .optional(),
  customer_details: z.object({
    customer_name: z.string().min(1),
    customer_phone: z.string().min(10),
  }),
});

// Custom error classes for better error handling
export class CashfreeError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = 'CashfreeError';
  }
}

export class CashfreeValidationError extends CashfreeError {
  constructor(
    message: string,
    public readonly validationErrors?: unknown
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'CashfreeValidationError';
  }
}

export class CashfreeNetworkError extends CashfreeError {
  constructor(
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message, 'NETWORK_ERROR');
    this.name = 'CashfreeNetworkError';
  }
}

const cashfreeConfigSchema = z.object({
  clientId: z.string().min(1, 'Cashfree Client ID is required'),
  clientSecret: z.string().min(1, 'Cashfree Client Secret is required'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
});

export type CashfreeConfig = z.infer<typeof cashfreeConfigSchema>;

export class CashfreeClient {
  private readonly config: CashfreeConfig;
  private readonly baseUrl: string;

  constructor(config: CashfreeConfig) {
    try {
      this.config = cashfreeConfigSchema.parse(config);
    } catch (error) {
      throw new CashfreeValidationError('Invalid Cashfree configuration', error);
    }

    this.baseUrl =
      this.config.environment === 'production'
        ? 'https://api.cashfree.com/pg'
        : 'https://sandbox.cashfree.com/pg';
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-api-version': '2025-01-01',
      'x-client-id': this.config.clientId,
      'x-client-secret': this.config.clientSecret,
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Cashfree API error: ${response.status}`);
    }

    return data;
  }

  async createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResponse> {
    try {
      // Validate params
      createPaymentLinkParamsSchema.parse(params);
      console.log('params', params);

      return await this.request<PaymentLinkResponse>('/links', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new CashfreeValidationError('Invalid payment link parameters', error.errors);
      }
      throw error;
    }
  }

  // Retrieves an existing payment link by ID
  async getPaymentLink(linkId: string): Promise<PaymentLinkResponse> {
    if (!linkId || typeof linkId !== 'string') {
      throw new CashfreeValidationError('Link ID is required and must be a string');
    }

    return this.request<PaymentLinkResponse>(`/links/${encodeURIComponent(linkId)}`);
  }
}

// Types based on Cashfree API documentation
export type CreatePaymentLinkParams = z.infer<typeof createPaymentLinkParamsSchema>;

// Create singleton instance
let cashfreeClient: CashfreeClient | null = null;

export function getCashfreeClient(): CashfreeClient {
  if (!cashfreeClient) {
    const config = {
      clientId: env.CASHFREE_CLIENT_ID,
      clientSecret: env.CASHFREE_CLIENT_SECRET,
      environment: env.CASHFREE_ENVIRONMENT,
    };

    cashfreeClient = new CashfreeClient(config);
  }

  return cashfreeClient;
}

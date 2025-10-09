import {
  getCashfreeClient,
  type CreatePaymentLinkParams,
  type PaymentLinkResponse,
} from './client';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { env } from '@/env';
import { getBranchConfigWithTenant } from '@/server/db/branch';

const createPaymentLinkSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  customerPhone: z
    .string()
    .min(1, 'Phone number is required')
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length === 10, {
      message: 'Phone number must be exactly 10 digits',
    }),
  customerName: z.string().min(1, 'Customer name is required').max(100),
  planId: z.string().min(1, 'Plan ID is required'),
  sendSms: z.boolean().optional().default(true),
});

export type CreatePaymentLinkRequest = {
  amount: number;
  customerPhone: string;
  customerName: string;
  planId: string;
  sendSms?: boolean;
};

export type PaymentLinkResult = {
  success: boolean;
  data?: {
    linkId: string;
    paymentUrl: string;
    qrCode: string;
    expiryTime?: string;
  };
  error?: string;
};

export async function createPaymentLink(
  request: CreatePaymentLinkRequest
): Promise<PaymentLinkResult> {
  try {
    // Validate input
    const validatedData = createPaymentLinkSchema.parse(request);
    const { tenant } = await getBranchConfigWithTenant();

    const client = getCashfreeClient();

    const linkId = `${tenant.name}_${nanoid(8)}`;

    const params: CreatePaymentLinkParams = {
      link_id: linkId,
      link_amount: validatedData.amount,
      link_currency: 'INR',
      customer_details: {
        customer_phone: validatedData.customerPhone,
        customer_name: validatedData.customerName,
      },
      link_purpose: `Payment to ${tenant.name}`,
      link_notify: {
        send_sms: validatedData.sendSms,
      },
      link_notes: {
        planId: validatedData.planId,
      },
      link_meta: {
        notify_url: `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/cashfree`,
      },
    };

    const response: PaymentLinkResponse = await client.createPaymentLink(params);

    // Validate response
    if (!response?.link_id || !response?.link_url) {
      throw new Error('Invalid response from Cashfree API');
    }

    return {
      success: true,
      data: {
        linkId: response.link_id,
        paymentUrl: response.link_url,
        qrCode: response.link_qrcode || '',
        expiryTime: response.link_expiry_time,
      },
    };
  } catch (error) {
    console.error('Failed to create Cashfree payment link:', {
      error,
      request: {
        ...request,
        customerPhone: request.customerPhone?.slice(-4).padStart(10, '*'), // Mask phone for security
      },
    });

    let errorMessage = 'Failed to create payment link';

    if (error instanceof z.ZodError) {
      errorMessage = error.errors[0]?.message || 'Validation failed';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function getPaymentLinkStatus(linkId: string): Promise<PaymentLinkResult> {
  try {
    const client = getCashfreeClient();

    const response: PaymentLinkResponse = await client.getPaymentLink(linkId);

    return {
      success: true,
      data: {
        linkId: response.link_id,
        paymentUrl: response.link_url,
        qrCode: response.link_qrcode,
        expiryTime: response.link_expiry_time,
      },
    };
  } catch (error) {
    console.error('Failed to get Cashfree payment link:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to get payment link';

    return {
      success: false,
      error: errorMessage,
    };
  }
}

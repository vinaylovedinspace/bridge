import {
  getCashfreeClient,
  type CreatePaymentLinkParams,
  type PaymentLinkResponse,
} from './client';
import { nanoid } from 'nanoid';
import { z } from 'zod';
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
  customerEmail: z.string().email().optional(),
  paymentId: z.string().min(1, 'Payment ID is required'),
  type: z.enum(['enrollment', 'rto-service']),
  sendSms: z.boolean().optional().default(true),
  sendEmail: z.boolean().optional().default(false),
  expiryInDays: z.number().int().min(1).max(365).optional(),
  enablePartialPayments: z.boolean().optional().default(false),
  minimumPartialAmount: z.number().positive().optional(),
});

export type CreatePaymentLinkRequest = z.infer<typeof createPaymentLinkSchema>;

export type PaymentLinkResult = {
  success: boolean;
  data?: {
    linkId: string;
    paymentUrl: string;
    qrCode: string;
    expiryTime?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'PAID' | 'EXPIRED';
    amountPaid?: number;
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

    const linkId = `${tenant.name.replace(/\s/g, '_')}_${nanoid(8)}`;

    // Calculate expiry time - default to 1 day (24 hours)
    const expiryDays = validatedData.expiryInDays || 1;
    const expiryTime = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    const params: CreatePaymentLinkParams = {
      link_id: linkId,
      link_amount: validatedData.amount,
      link_currency: 'INR',
      customer_details: {
        customer_phone: validatedData.customerPhone,
        customer_name: validatedData.customerName,
        customer_email: validatedData.customerEmail,
      },
      link_purpose: `Payment to ${tenant.name}`,
      link_notify: {
        send_sms: validatedData.sendSms,
        send_email: validatedData.sendEmail,
      },
      link_notes: {
        paymentId: validatedData.paymentId,
        type: validatedData.type,
      },
      link_meta: {
        notify_url: `https://bridge.welovedinspace.studio/api/webhooks/cashfree`,
      },
      link_expiry_time: expiryTime,
      link_partial_payments: validatedData.enablePartialPayments,
      link_minimum_partial_amount: validatedData.minimumPartialAmount,
      link_auto_reminders: validatedData.sendSms, // Enable auto-reminders if SMS is enabled
    };

    const response: PaymentLinkResponse = await client.createPaymentLink(params, validatedData.id);

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
        status: response.link_status,
        amountPaid: response.link_amount_paid,
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
        status: response.link_status,
        amountPaid: response.link_amount_paid,
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

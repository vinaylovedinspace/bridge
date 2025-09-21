import {
  getCashfreeClient,
  type CreatePaymentLinkParams,
  type PaymentLinkResponse,
} from './client';
import { nanoid } from 'nanoid';
import { getCurrentTenantName } from '@/server/db/tenant';

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
    const client = getCashfreeClient();

    const linkId = `bridge_plan_${nanoid(8)}`;

    // Ensure phone number is properly formatted (10 digits for India)
    const formattedPhone = request.customerPhone.replace(/\D/g, '').slice(-10);

    // Get tenant name for payment purpose
    const tenantName = await getCurrentTenantName();
    const organizationName = tenantName || 'Driving School';

    const params: CreatePaymentLinkParams = {
      link_id: linkId,
      link_amount: request.amount,
      link_currency: 'INR',
      customer_details: {
        customer_phone: formattedPhone,
        customer_name: request.customerName,
      },
      link_purpose: `Payment to ${organizationName}`,
      link_notify: {
        send_sms: true,
      },
      link_notes: {
        planId: request.planId,
      },
      link_meta: {
        notify_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/cashfree`,
      },
    };

    console.log('Creating payment link with params:', {
      ...params,
      customer_details: {
        ...params.customer_details,
        customer_phone: `${formattedPhone.slice(0, 6)}****`, // Partially hide phone for security
      },
    });

    const response: PaymentLinkResponse = await client.createPaymentLink(params);

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
    console.error('Failed to create Cashfree payment link:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to create payment link';

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

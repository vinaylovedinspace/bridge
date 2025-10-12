'use server';

import { PaymentLinkResult } from '@/lib/cashfree/payment-links';
import { createPaymentLink, getPaymentLinkStatus } from '@/lib/cashfree/payment-links';
import { CreatePaymentLinkRequest } from '@/lib/cashfree/payment-links';

export async function createPaymentLinkAction(
  request: CreatePaymentLinkRequest
): Promise<PaymentLinkResult> {
  try {
    const result = await createPaymentLink(request);
    return result;
  } catch (error) {
    console.error('Failed to create payment link:', error);
    return {
      success: false,
      error: 'Failed to create payment link. Please try again.',
    };
  }
}

export async function getPaymentLinkStatusAction(linkId: string): Promise<PaymentLinkResult> {
  try {
    const result = await getPaymentLinkStatus(linkId);
    return result;
  } catch (error) {
    console.error('Failed to get payment link status:', error);
    return {
      success: false,
      error: 'Failed to get payment link status.',
    };
  }
}

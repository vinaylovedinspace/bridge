'use server';

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

export type CreatePaymentLinkRequest = {
  amount: number;
  customerPhone: string;
  customerName: string;
  customerEmail?: string;
  paymentId: string;
  type: 'enrollment' | 'rto-service';
  sendSms?: boolean;
  sendEmail?: boolean;
  expiryInDays?: number;
  enablePartialPayments?: boolean;
  minimumPartialAmount?: number;
};

export async function createPaymentLinkAction(
  request: CreatePaymentLinkRequest
): Promise<PaymentLinkResult> {
  // TODO: Implement payment link creation
  console.log('Payment link creation requested:', request);
  return {
    success: false,
    error: 'Payment link creation not implemented',
  };
}

export async function getPaymentLinkStatusAction(linkId: string): Promise<PaymentLinkResult> {
  // TODO: Implement payment link status check
  console.log('Payment link status check requested:', linkId);
  return {
    success: false,
    error: 'Payment link status check not implemented',
  };
}

// PhonePe Payment Gateway Types

export type PhonePeEnvironment = 'PRODUCTION' | 'UAT';

export type PhonePePaymentInstrumentType = 'PAY_PAGE' | 'UPI_INTENT' | 'UPI_QR';

export type PhonePeTransactionStatus =
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_ERROR'
  | 'PAYMENT_DECLINED'
  | 'PAYMENT_CANCELLED'
  | 'INTERNAL_SERVER_ERROR';

export type PhonePePaymentState = 'COMPLETED' | 'FAILED' | 'PENDING';

// Payment Initiation Request
export type PhonePePayRequest = {
  merchantId: string;
  merchantTransactionId: string;
  merchantUserId: string;
  amount: number; // in paise
  redirectUrl: string;
  redirectMode: 'POST' | 'REDIRECT';
  callbackUrl: string;
  mobileNumber?: string;
  paymentInstrument: {
    type: PhonePePaymentInstrumentType;
    targetApp?: string;
  };
  deviceContext?: {
    deviceOS: string;
  };
};

// Payment Initiation Response
export type PhonePePayResponse = {
  success: boolean;
  code: string;
  message: string;
  data: {
    merchantId: string;
    merchantTransactionId: string;
    instrumentResponse: {
      type: string;
      redirectInfo?: {
        url: string;
        method: string;
      };
      intentUrl?: string;
      qrData?: string;
    };
  };
};

// Order Status Response
export type PhonePeOrderStatusResponse = {
  success: boolean;
  code: string;
  message: string;
  data: {
    merchantId: string;
    merchantTransactionId: string;
    transactionId: string;
    amount: number;
    state: PhonePePaymentState;
    responseCode: string;
    paymentInstrument?: {
      type: string;
      utr?: string;
      cardType?: string;
      pgTransactionId?: string;
      bankTransactionId?: string;
      pgAuthorizationCode?: string;
      arn?: string;
      bankId?: string;
      pgServiceTransactionId?: string;
    };
  };
};

// Webhook/Callback Payload (simplified from SDK CallbackData)
export type PhonePeWebhookData = {
  orderId: string; // merchantOrderId
  state: string;
  amount: number;
  errorCode?: string;
  paymentDetails?: Array<{
    transactionId?: string;
    state?: string;
    instrument?: {
      type?: string;
    };
    rail?: {
      utr?: string;
      type?: string;
    };
  }>;
};

// Refund Request
export type PhonePeRefundRequest = {
  merchantId: string;
  merchantTransactionId: string;
  originalTransactionId: string;
  amount: number;
  callbackUrl: string;
};

// Refund Response
export type PhonePeRefundResponse = {
  success: boolean;
  code: string;
  message: string;
  data: {
    merchantId: string;
    merchantTransactionId: string;
    transactionId: string;
    amount: number;
    state: string;
    responseCode: string;
  };
};

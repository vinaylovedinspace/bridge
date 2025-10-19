export interface PaymentGatewayConfig {
  gatewayName: string;
  apiKey: string;
  apiSecret?: string;
  merchantId?: string;
  environment: 'sandbox' | 'production';
  webhookUrl?: string;
}

export interface PaymentLinkRequest {
  amount: number;
  currency?: string;
  orderId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  description?: string;
  expiryMinutes?: number;
  returnUrl?: string;
  notifyUrl?: string;
}

export interface PaymentLinkResponse {
  success: boolean;
  paymentLink?: string;
  orderId?: string;
  error?: string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  status: 'success' | 'failed' | 'pending';
  transactionId?: string;
  amount?: number;
  error?: string;
}

// Payment Gateway Provider Functions
export type PaymentGatewayProvider = {
  generatePaymentLink: (request: PaymentLinkRequest) => Promise<PaymentLinkResponse>;
  verifyPayment: (orderId: string) => Promise<PaymentVerificationResponse>;
};

/**
 * Cashfree Payment Gateway Implementation
 * TODO: Replace with actual Cashfree SDK or any other payment gateway when available
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createCashfreeProvider = (_config: PaymentGatewayConfig): PaymentGatewayProvider => ({
  generatePaymentLink: async (request: PaymentLinkRequest): Promise<PaymentLinkResponse> => {
    try {
      console.log('💳 [Cashfree] Generating payment link for order:', request.orderId);

      // TODO: Implement actual Cashfree API integration
      // This is a placeholder implementation
      const mockPaymentLink = `https://payments.cashfree.com/order/${request.orderId}?amount=${request.amount}`;

      console.log('✅ [Cashfree] Payment link generated successfully');

      return {
        success: true,
        paymentLink: mockPaymentLink,
        orderId: request.orderId,
      };
    } catch (error) {
      console.error('❌ [Cashfree] Error generating payment link:', error);
      return {
        success: false,
        error: 'Failed to generate payment link',
      };
    }
  },

  verifyPayment: async (orderId: string): Promise<PaymentVerificationResponse> => {
    try {
      console.log('💳 [Cashfree] Verifying payment for order:', orderId);

      // TODO: Implement actual Cashfree payment verification
      // This is a placeholder implementation

      return {
        success: true,
        status: 'success',
        transactionId: `txn_${orderId}`,
        amount: 0, // Will be populated from actual API response
      };
    } catch (error) {
      console.error('❌ [Cashfree] Error verifying payment:', error);
      return {
        success: false,
        status: 'failed',
        error: 'Failed to verify payment',
      };
    }
  },
});

/**
 * Razorpay Payment Gateway Implementation
 * TODO: Replace with actual Razorpay SDK when available
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createRazorpayProvider = (_config: PaymentGatewayConfig): PaymentGatewayProvider => ({
  generatePaymentLink: async (request: PaymentLinkRequest): Promise<PaymentLinkResponse> => {
    try {
      console.log('💳 [Razorpay] Generating payment link for order:', request.orderId);

      // TODO: Implement actual Razorpay API integration
      // This is a placeholder implementation
      const mockPaymentLink = `https://rzp.io/l/${request.orderId}`;

      console.log('✅ [Razorpay] Payment link generated successfully');

      return {
        success: true,
        paymentLink: mockPaymentLink,
        orderId: request.orderId,
      };
    } catch (error) {
      console.error('❌ [Razorpay] Error generating payment link:', error);
      return {
        success: false,
        error: 'Failed to generate payment link',
      };
    }
  },

  verifyPayment: async (orderId: string): Promise<PaymentVerificationResponse> => {
    try {
      console.log('💳 [Razorpay] Verifying payment for order:', orderId);

      // TODO: Implement actual Razorpay payment verification
      // This is a placeholder implementation

      return {
        success: true,
        status: 'success',
        transactionId: `pay_${orderId}`,
        amount: 0, // Will be populated from actual API response
      };
    } catch (error) {
      console.error('❌ [Razorpay] Error verifying payment:', error);
      return {
        success: false,
        status: 'failed',
        error: 'Failed to verify payment',
      };
    }
  },
});

/**
 * Create payment gateway provider based on gateway name
 */
export const createPaymentProvider = (
  gatewayName: string,
  config: PaymentGatewayConfig
): PaymentGatewayProvider => {
  switch (gatewayName.toLowerCase()) {
    case 'cashfree':
      return createCashfreeProvider(config);
    case 'razorpay':
      return createRazorpayProvider(config);
    default:
      throw new Error(`Unsupported payment gateway: ${gatewayName}`);
  }
};

/**
 * Generate payment link using configured gateway
 */
export const generatePaymentLink = async (
  request: PaymentLinkRequest
): Promise<PaymentLinkResponse> => {
  const config = getPaymentGatewayConfig();
  const provider = createPaymentProvider(config.gatewayName, config);
  return provider.generatePaymentLink(request);
};

/**
 * Verify payment using configured gateway
 */
export const verifyPayment = async (orderId: string): Promise<PaymentVerificationResponse> => {
  const config = getPaymentGatewayConfig();
  const provider = createPaymentProvider(config.gatewayName, config);
  return provider.verifyPayment(orderId);
};

/**
 * Get payment gateway configuration from environment variables
 */
const getPaymentGatewayConfig = (): PaymentGatewayConfig => {
  const gatewayName = process.env.PAYMENT_GATEWAY || 'cashfree';

  return {
    gatewayName,
    apiKey: process.env.PAYMENT_GATEWAY_API_KEY || '',
    apiSecret: process.env.PAYMENT_GATEWAY_API_SECRET,
    merchantId: process.env.PAYMENT_GATEWAY_MERCHANT_ID,
    environment: (process.env.PAYMENT_GATEWAY_ENV as 'sandbox' | 'production') || 'sandbox',
    webhookUrl: process.env.PAYMENT_GATEWAY_WEBHOOK_URL,
  };
};

/**
 * Factory function to create payment gateway service
 * This will be configured based on your environment variables
 */
export const createPaymentGatewayService = () => {
  const config = getPaymentGatewayConfig();
  const provider = createPaymentProvider(config.gatewayName, config);

  return {
    generatePaymentLink: provider.generatePaymentLink,
    verifyPayment: provider.verifyPayment,
  };
};

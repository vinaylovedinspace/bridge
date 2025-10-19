// Modern Core Functions
export { sendWhatsAppMessage, sendTextMessage, sendDocument } from './core/client';

export {
  buildOnboardingMessage,
  buildPaymentReceiptMessage,
  buildPaymentLinkMessage,
  buildSessionReminderMessage,
  buildPaymentSuccessMessage,
} from './core/message-builder';

export { validateAndSetup, sendMessageWithRetry, buildMessageData } from './core/service-base';

export { isValidPhone, formatPhoneForWhatsApp, formatPhoneForDisplay } from './utils/phone';

export { withRetry, withExponentialBackoff } from './utils/retry';

export { logMessageAttempt, hasMessageBeenSent } from './utils/logger';

export { sendOnboardingMessage } from './services/onboarding-service';

export {
  sendPaymentReceipt,
  sendPaymentLink,
  sendPaymentSuccess,
  sendPaymentReceiptWithDocument,
} from './services/payment-service';

export { sendSessionReminder } from './services/session-reminder-service';

export {
  sendUpcomingSessionReminders,
  sendSingleSessionReminder,
} from './services/session-scheduler';

export {
  // Modern Payment Gateway Functions
  generatePaymentLink,
  verifyPayment,
  createPaymentGatewayService,
  createPaymentProvider,
  createCashfreeProvider,
  createRazorpayProvider,
} from './services/payment-gateway-service';

export type { WhatsAppMessage, WhatsAppResponse } from './core/client';

export type {
  OnboardingMessageData,
  PaymentMessageData,
  SessionReminderData,
  PaymentLinkData,
} from './core/message-builder';

export type { MessageLogData } from './utils/logger';

export type { RetryOptions } from './utils/retry';

export type { OnboardingClientData } from './services/onboarding-service';

export type { PaymentClientData, PaymentData } from './services/payment-service';

export type {
  SessionReminderClientData,
  SessionReminderServiceData,
} from './services/session-reminder-service';

export type { SessionSchedulerOptions } from './services/session-scheduler';

export type {
  PaymentGatewayConfig,
  PaymentLinkRequest,
  PaymentLinkResponse,
} from './services/payment-gateway-service';

export type { BaseClientData, ServiceResult, MessageType } from './core/service-base';

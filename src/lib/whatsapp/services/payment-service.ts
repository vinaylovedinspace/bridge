import {
  buildPaymentReceiptMessage,
  buildPaymentLinkMessage,
  buildPaymentSuccessMessage,
} from '../core/message-builder';
import {
  sendMessageWithRetry,
  buildMessageData,
  BaseClientData,
  validateAndSetup,
} from '../core/service-base';

export type PaymentClientData = BaseClientData;

export interface PaymentData {
  amount: number;
  date: Date;
  type: 'full' | 'partial' | 'installment';
  paymentMode: string;
  transactionReference?: string;
  totalAmount?: number;
  remainingAmount?: number;
  installmentNumber?: number;
}
export async function sendPaymentReceipt(
  client: PaymentClientData,
  payment: PaymentData
): Promise<{ success: boolean; error?: string }> {
  console.log('📱 [Payment] Sending receipt for:', client.firstName, client.lastName);

  const setup = await validateAndSetup(client, 'payment_receipt');
  if (!setup.success) return setup;

  const messageData = buildMessageData(client, setup.tenantName, {
    amount: payment.amount,
    date: payment.date,
    type: payment.type,
    paymentMode: payment.paymentMode,
    transactionReference: payment.transactionReference,
    totalAmount: payment.totalAmount,
    remainingAmount: payment.remainingAmount,
    installmentNumber: payment.installmentNumber,
  });

  const message = buildPaymentReceiptMessage(messageData);
  return await sendMessageWithRetry(client, message, 'payment_receipt');
}

export async function sendPaymentLink(
  client: PaymentClientData,
  paymentLink: { amount: number; paymentLink: string; expiryHours?: number }
): Promise<{ success: boolean; error?: string }> {
  console.log('📱 [Payment] Sending link for:', client.firstName, client.lastName);

  const setup = await validateAndSetup(client, 'payment_link');
  if (!setup.success) return setup;

  const messageData = buildMessageData(client, setup.tenantName, {
    amount: paymentLink.amount,
    paymentLink: paymentLink.paymentLink,
    expiryHours: paymentLink.expiryHours,
  });

  const message = buildPaymentLinkMessage(messageData);
  return await sendMessageWithRetry(client, message, 'payment_link');
}

export async function sendPaymentSuccess(
  client: PaymentClientData,
  payment: {
    amount: number;
    transactionReference: string;
    paymentMode: string;
  }
): Promise<{ success: boolean; error?: string }> {
  console.log('📱 [Payment] Sending success for:', client.firstName, client.lastName);

  const setup = await validateAndSetup(client, 'payment_success');
  if (!setup.success) return setup;

  const messageData = buildMessageData(client, setup.tenantName, {
    amount: payment.amount,
    transactionReference: payment.transactionReference,
    paymentMode: payment.paymentMode,
  });

  const message = buildPaymentSuccessMessage(messageData);
  return await sendMessageWithRetry(client, message, 'payment_success');
}

export async function sendPaymentReceiptWithDocument(
  client: PaymentClientData,
  payment: PaymentData,
  receiptPdfUrl: string
): Promise<{ success: boolean; error?: string }> {
  console.log('📱 [Payment] Sending receipt with PDF for:', client.firstName, client.lastName);

  const setup = await validateAndSetup(client, 'payment_receipt_with_pdf');
  if (!setup.success) return setup;

  const messageData = buildMessageData(client, setup.tenantName, {
    amount: payment.amount,
    date: payment.date,
    type: payment.type,
    paymentMode: payment.paymentMode,
    transactionReference: payment.transactionReference,
    totalAmount: payment.totalAmount,
    remainingAmount: payment.remainingAmount,
    installmentNumber: payment.installmentNumber,
  });

  const message = buildPaymentReceiptMessage(messageData);
  const receiptNumber = payment.transactionReference || `REC-${Date.now()}`;
  const filename = `Payment_Receipt_${receiptNumber}.pdf`;

  // Custom sender function for document
  const sendDocumentMessage = async (phone: string, msg: string) => {
    const { sendDocument } = await import('../core/client');
    return await sendDocument(phone, receiptPdfUrl, filename, msg);
  };

  return await sendMessageWithRetry(
    client,
    message,
    'payment_receipt_with_pdf',
    undefined,
    sendDocumentMessage
  );
}

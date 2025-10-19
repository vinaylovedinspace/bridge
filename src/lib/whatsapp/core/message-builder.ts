import { format } from 'date-fns';

export interface OnboardingMessageData {
  name: string;
  schedule: Array<{ date: Date; time: string }>;
  totalSessions: number;
  vehicleDetails: {
    name: string;
    number: string;
    type?: string;
  };
  tenantName: string;
}

export interface PaymentMessageData {
  name: string;
  amount: number;
  date: Date;
  type: 'full' | 'partial' | 'installment';
  paymentMode: string;
  transactionReference?: string;
  totalAmount?: number;
  remainingAmount?: number;
  installmentNumber?: number;
  tenantName: string;
}

export interface SessionReminderData {
  name: string;
  sessionDate: string;
  startTime: string;
  sessionNumber?: number;
  instructorName?: string;
  vehicleDetails?: {
    name: string;
    number: string;
  };
  tenantName: string;
}

export interface PaymentLinkData {
  name: string;
  amount: number;
  paymentLink: string;
  expiryHours?: number;
  tenantName: string;
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd MMM yyyy');
}

function formatTime(time: string): string {
  // Convert HH:MM:SS to HH:MM AM/PM
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function buildOnboardingMessage(data: OnboardingMessageData): string {
  const { name, schedule, totalSessions, vehicleDetails, tenantName } = data;

  const firstSession = schedule[0];
  const lastSession = schedule[schedule.length - 1];
  const scheduleText = `${formatDate(firstSession.date)} to ${formatDate(lastSession.date)} at ${formatTime(firstSession.time)}`;

  return `🎉 Welcome to ${tenantName}!

Hi ${name},

Your enrollment is confirmed! We're excited to help you become a confident driver.

📋 ENROLLMENT DETAILS
━━━━━━━━━━━━━━
Sessions: ${totalSessions}
Vehicle: ${vehicleDetails.name} (${vehicleDetails.number})
${vehicleDetails.type ? `Type: ${vehicleDetails.type}` : ''}

📅 SCHEDULE
━━━━━━━━━━━━━━
${scheduleText}

Need to reschedule? Just reply to this message.

Best regards,
${tenantName} Team`;
}

export function buildPaymentReceiptMessage(data: PaymentMessageData): string {
  const {
    name,
    amount,
    date,
    type,
    paymentMode,
    transactionReference,
    totalAmount,
    remainingAmount,
    installmentNumber,
    tenantName,
  } = data;

  const receiptNumber = transactionReference || `REC-${Date.now()}`;
  const dateFormatted = formatDate(date);
  const timeFormatted = format(date, 'hh:mm a');

  let receiptType = '';
  let amountDetails = '';
  let paymentStatus = '';

  switch (type) {
    case 'full':
      receiptType = 'FULL PAYMENT';
      amountDetails = `Amount Paid: ${formatCurrency(amount)}`;
      paymentStatus = '✅ FULLY PAID';
      break;
    case 'partial':
      receiptType = 'PARTIAL PAYMENT';
      amountDetails = `Amount Paid: ${formatCurrency(amount)}`;
      if (totalAmount && remainingAmount) {
        amountDetails += `\nTotal Course Fee: ${formatCurrency(totalAmount)}`;
        amountDetails += `\nBalance Due: ${formatCurrency(remainingAmount)}`;
        paymentStatus = '⚠️ PARTIALLY PAID';
      }
      break;
    case 'installment':
      const installmentNum = installmentNumber || 1;
      const totalInstallments = totalAmount ? Math.ceil(totalAmount / amount) : 2;
      receiptType = `INSTALLMENT ${installmentNum}/${totalInstallments}`;
      amountDetails = `Installment Amount: ${formatCurrency(amount)}`;
      if (totalAmount && remainingAmount) {
        amountDetails += `\nTotal Course Fee: ${formatCurrency(totalAmount)}`;
        amountDetails += `\nBalance Due: ${formatCurrency(remainingAmount)}`;
        paymentStatus = remainingAmount > 0 ? '⚠️ PARTIALLY PAID' : '✅ FULLY PAID';
      }
      break;
  }

  const paymentModeDisplay = getPaymentModeDisplay(paymentMode);

  return `🧾 PAYMENT RECEIPT

Receipt No: ${receiptNumber}
Date: ${dateFormatted} at ${timeFormatted}

STUDENT: ${name}

PAYMENT DETAILS
━━━━━━━━━━━━━━
Type: ${receiptType}
${amountDetails}
Payment Mode: ${paymentModeDisplay}

Status: ${paymentStatus}

Thank you for your payment! 🙏

Best regards,
${tenantName} Team`;
}

export function buildPaymentLinkMessage(data: PaymentLinkData): string {
  const { name, amount, paymentLink, expiryHours = 24, tenantName } = data;

  return `💳 Complete Your Payment

Hi ${name},

Please complete your payment of ${formatCurrency(amount)} to confirm your enrollment.

💳 PAYMENT LINK
${paymentLink}

⏰ Valid for ${expiryHours} hours
🔒 Secure payment gateway

Click the link above to pay securely.

Questions? Just reply to this message.

Best regards,
${tenantName} Team`;
}

export function buildSessionReminderMessage(data: SessionReminderData): string {
  const {
    name,
    sessionDate,
    startTime,
    sessionNumber,
    instructorName,
    vehicleDetails,
    tenantName,
  } = data;

  const dateFormatted = formatDate(sessionDate);
  const timeFormatted = formatTime(startTime);
  const sessionText = sessionNumber ? `Session ${sessionNumber}` : 'Your driving session';
  const instructorText = instructorName ? `\nInstructor: ${instructorName}` : '';
  const vehicleText = vehicleDetails
    ? `\nVehicle: ${vehicleDetails.name} (${vehicleDetails.number})`
    : '';

  return `⏰ Session Reminder

Hi ${name},

Reminder about your upcoming driving session:

📅 SESSION DETAILS
━━━━━━━━━━━━━━
${sessionText}
Date: ${dateFormatted}
Time: ${timeFormatted}${instructorText}${vehicleText}

Please arrive 10 minutes early with your learning license.

Need to reschedule? Just reply to this message.

See you soon! 🚗

Best regards,
${tenantName} Team`;
}

export function buildPaymentSuccessMessage(data: {
  name: string;
  amount: number;
  transactionReference: string;
  paymentMode: string;
  tenantName: string;
}): string {
  const { name, amount, transactionReference, paymentMode, tenantName } = data;
  const paymentModeDisplay = getPaymentModeDisplay(paymentMode);

  return `✅ Payment Successful!

Hi ${name},

Your payment has been processed successfully!

💰 PAYMENT DETAILS
━━━━━━━━━━━━━━
Amount: ${formatCurrency(amount)}
Payment Mode: ${paymentModeDisplay}
Transaction ID: ${transactionReference}
Date: ${formatDate(new Date())}

Your enrollment is confirmed. We'll send your session schedule shortly.

Welcome to ${tenantName}! 🎉

Best regards,
${tenantName} Team`;
}

function getPaymentModeDisplay(paymentMode: string): string {
  switch (paymentMode) {
    case 'PAYMENT_LINK':
      return 'Online Payment';
    case 'QR':
      return 'QR Code/UPI';
    case 'CASH':
      return 'Cash';
    case 'CARD':
      return 'Card Payment';
    case 'UPI':
      return 'UPI Payment';
    default:
      return paymentMode;
  }
}

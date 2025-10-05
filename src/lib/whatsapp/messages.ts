import { format } from 'date-fns';

export function generateOnboardingMessage(student: {
  name: string;
  schedule: { date: Date; time: string }[];
  totalSessions: number;
}) {
  const firstSession = student.schedule[0];
  const lastSession = student.schedule[student.schedule.length - 1];

  const scheduleDetails = `${format(firstSession.date, 'dd MMM')} to ${format(lastSession.date, 'dd MMM')} at ${firstSession.time}`;

  const moreSessionsText = '';

  return `Dear ${student.name},

Welcome to our Driving School! 🚗

We're excited to begin your driving journey with us.

━━━━━━━━━━━━━━━━━━━━━━
📅 YOUR SESSION SCHEDULE
━━━━━━━━━━━━━━━━━━━━━━
${scheduleDetails}${moreSessionsText}

Total Sessions: ${student.totalSessions}

━━━━━━━━━━━━━━━━━━━━━━
📱 IMPORTANT REMINDERS
━━━━━━━━━━━━━━━━━━━━━━
✓ Arrive 10 minutes early
✓ Bring your learning license
✓ Wear comfortable footwear

For any questions, reply to this message.

Good luck with your driving journey! 🚗💨

Best regards,
Your Driving School Team`;
}

export function generatePaymentMessage(student: {
  name: string;
  amount: number;
  date: Date;
  type: 'full' | 'partial' | 'installment';
}) {
  const paymentTypeText =
    student.type === 'full'
      ? 'full payment'
      : student.type === 'partial'
        ? 'partial payment'
        : 'installment payment';

  return `Dear ${student.name},

✅ Payment Received Successfully!

We have received your ${paymentTypeText} of ₹${student.amount.toLocaleString('en-IN')} on ${format(student.date, 'dd MMM yyyy')}.

Thank you for your payment! 🙏

For any queries, please reply to this message or contact us.

Best regards,
Your Driving School Team`;
}

export function generatePaymentReceipt(student: {
  name: string;
  amount: number;
  date: Date;
  type: 'full' | 'partial' | 'installment';
  paymentMode: string;
  transactionReference?: string;
  totalAmount?: number;
  remainingAmount?: number;
  installmentNumber?: number;
}) {
  const receiptNumber = student.transactionReference || `REC-${Date.now()}`;
  const dateFormatted = format(student.date, 'dd MMM yyyy');
  const timeFormatted = format(student.date, 'hh:mm a');

  let receiptType = '';
  let amountDetails = '';
  let paymentStatus = '';

  switch (student.type) {
    case 'full':
      receiptType = 'FULL PAYMENT';
      amountDetails = `Amount Paid: ₹${student.amount.toLocaleString('en-IN')}`;
      paymentStatus = '✅ FULLY PAID';
      break;
    case 'partial':
      receiptType = 'PARTIAL PAYMENT';
      amountDetails = `Amount Paid: ₹${student.amount.toLocaleString('en-IN')}`;
      if (student.totalAmount && student.remainingAmount) {
        amountDetails += `\nTotal Course Fee: ₹${student.totalAmount.toLocaleString('en-IN')}`;
        amountDetails += `\nBalance Due: ₹${student.remainingAmount.toLocaleString('en-IN')}`;
        paymentStatus = '⚠️ PARTIALLY PAID';
      }
      break;
    case 'installment':
      const installmentNum = student.installmentNumber || 1;
      const totalInstallments = student.totalAmount
        ? Math.ceil(student.totalAmount / student.amount)
        : 2;
      receiptType = `INSTALLMENT ${installmentNum}/${totalInstallments}`;
      amountDetails = `Installment Amount: ₹${student.amount.toLocaleString('en-IN')}`;
      if (student.totalAmount && student.remainingAmount) {
        amountDetails += `\nTotal Course Fee: ₹${student.totalAmount.toLocaleString('en-IN')}`;
        amountDetails += `\nBalance Due: ₹${student.remainingAmount.toLocaleString('en-IN')}`;
        paymentStatus = student.remainingAmount > 0 ? '⚠️ PARTIALLY PAID' : '✅ FULLY PAID';
      }
      break;
  }

  const paymentModeDisplay =
    student.paymentMode === 'PAYMENT_LINK'
      ? 'Online Payment'
      : student.paymentMode === 'QR'
        ? 'QR Code/UPI'
        : student.paymentMode === 'CASH'
          ? 'Cash'
          : student.paymentMode;

  return `━━━━━━━━━━━━━━━━━━━━━━
🧾 PAYMENT RECEIPT
━━━━━━━━━━━━━━━━━━━━━━

Receipt No: ${receiptNumber}
Date: ${dateFormatted}
Time: ${timeFormatted}

━━━━━━━━━━━━━━━━━━━━━━
STUDENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━
Name: ${student.name}

━━━━━━━━━━━━━━━━━━━━━━
PAYMENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━
Type: ${receiptType}
${amountDetails}
Payment Mode: ${paymentModeDisplay}

━━━━━━━━━━━━━━━━━━━━━━
Status: ${paymentStatus}
━━━━━━━━━━━━━━━━━━━━━━

Thank you for your payment! 🙏

For any queries, please reply to this message or contact us directly.

Best regards,
Your Driving School Team`;
}

export function generateComprehensiveOnboardingMessage(student: {
  name: string;
  schedule: { date: Date; time: string }[];
  totalSessions: number;
  vehicleDetails: {
    name: string;
    number: string;
    type?: string;
  };
  paymentAmount: number;
  paymentMode: string;
  transactionReference?: string;
  totalAmount?: number;
  remainingAmount?: number;
}) {
  const firstSession = student.schedule[0];
  const lastSession = student.schedule[student.schedule.length - 1];

  const scheduleDetails = `${format(firstSession.date, 'dd MMM')} to ${format(lastSession.date, 'dd MMM')} at ${firstSession.time}`;

  const moreSessionsText = '';

  const receiptNumber = student.transactionReference || `REC-${Date.now()}`;
  const currentDate = new Date();
  const dateFormatted = format(currentDate, 'dd MMM yyyy');
  const timeFormatted = format(currentDate, 'hh:mm a');

  const paymentModeDisplay =
    student.paymentMode === 'PAYMENT_LINK'
      ? 'Online Payment'
      : student.paymentMode === 'QR'
        ? 'QR Code/UPI'
        : student.paymentMode === 'CASH'
          ? 'Cash'
          : student.paymentMode;

  // Check if transactionReference is a payment link URL
  const isPaymentLink =
    student.paymentMode === 'PAYMENT_LINK' &&
    student.transactionReference &&
    (student.transactionReference.startsWith('http://') ||
      student.transactionReference.startsWith('https://'));

  const paymentStatus =
    student.remainingAmount && student.remainingAmount > 0
      ? `⚠️ Balance Due: ₹${student.remainingAmount.toLocaleString('en-IN')}`
      : '✅ Fully Paid';

  // Payment link section (only if payment link mode and URL provided)
  const paymentLinkSection = isPaymentLink
    ? `

━━━━━━━━━━━━━━━━━━━━━━
💳 COMPLETE YOUR PAYMENT
━━━━━━━━━━━━━━━━━━━━━━
Click the link below to complete your payment securely:

${student.transactionReference}

⏰ Payment link is valid for 24 hours
🔒 Secure payment powered by Cashfree

Please complete the payment to confirm your enrollment.`
    : '';

  return `━━━━━━━━━━━━━━━━━━━━━━
🎉 WELCOME TO OUR DRIVING SCHOOL!
━━━━━━━━━━━━━━━━━━━━━━

Dear ${student.name},

Congratulations on taking the first step towards becoming a confident driver! We're excited to have you join our driving school family. 🚗✨

━━━━━━━━━━━━━━━━━━━━━━
📋 ENROLLMENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━
Total Sessions: ${student.totalSessions}
Vehicle: ${student.vehicleDetails.name}
Registration: ${student.vehicleDetails.number}
${student.vehicleDetails.type ? `Type: ${student.vehicleDetails.type}` : ''}

━━━━━━━━━━━━━━━━━━━━━━
📅 YOUR SESSION SCHEDULE
━━━━━━━━━━━━━━━━━━━━━━
${scheduleDetails}${moreSessionsText}

━━━━━━━━━━━━━━━━━━━━━━
💰 PAYMENT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━
${isPaymentLink ? 'Amount Due' : 'Amount Paid'}: ₹${student.paymentAmount.toLocaleString('en-IN')}
${student.totalAmount ? `Total Course Fee: ₹${student.totalAmount.toLocaleString('en-IN')}` : ''}
Payment Mode: ${paymentModeDisplay}
${!isPaymentLink ? `Receipt No: ${receiptNumber}` : ''}
${!isPaymentLink ? `Date: ${dateFormatted} at ${timeFormatted}` : ''}

${!isPaymentLink ? `Status: ${paymentStatus}` : 'Status: ⏳ Payment Pending'}${paymentLinkSection}

━━━━━━━━━━━━━━━━━━━━━━
📱 IMPORTANT REMINDERS
━━━━━━━━━━━━━━━━━━━━━━
✓ Arrive 10 minutes before your session
✓ Bring your learning license (if applicable)
✓ Wear comfortable footwear
✓ Carry a water bottle
✓ Be punctual for all sessions

━━━━━━━━━━━━━━━━━━━━━━

❓ Need to reschedule or have questions?
Reply to this message or call us directly.

Good luck with your driving journey! 🚗💨
We're here to help you become a safe and confident driver!

Best regards,
Your Driving School Team`;
}

export function generateCombinedOnboardingAndReceipt(student: {
  name: string;
  schedule: { date: Date; time: string }[];
  totalSessions: number;
  paymentAmount: number;
  paymentMode: string;
  transactionReference?: string;
}) {
  const onboardingMessage = generateOnboardingMessage({
    name: student.name,
    schedule: student.schedule,
    totalSessions: student.totalSessions,
  });

  const receiptMessage = generatePaymentReceipt({
    name: student.name,
    amount: student.paymentAmount,
    date: new Date(),
    type: 'full',
    paymentMode: student.paymentMode,
    transactionReference: student.transactionReference,
  });

  return `${onboardingMessage}\n\n${'─'.repeat(40)}\n\n${receiptMessage}`;
}

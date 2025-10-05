import { NextRequest, NextResponse } from 'next/server';
import {
  sendWhatsAppMessage,
  generateOnboardingMessage,
  generatePaymentMessage,
  generatePaymentReceipt,
  generateCombinedOnboardingAndReceipt,
  sendOnboardingWhatsApp,
  sendPaymentWhatsApp,
  sendPaymentReceiptWhatsApp,
  sendOnboardingWithReceiptWhatsApp,
  generateComprehensiveOnboardingMessage,
  formatPhoneForWhatsApp,
} from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const { testType, phoneNumber } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Format phone number for WhatsApp
    const formattedPhone = formatPhoneForWhatsApp(phoneNumber);
    console.log('📱 [Test] Original phone:', phoneNumber, 'Formatted phone:', formattedPhone);

    let result;

    switch (testType) {
      case 'simple':
        // Test basic message sending
        result = await sendWhatsAppMessage(
          formattedPhone,
          'Hello! This is a test message from your driving school app. 🚗'
        );
        break;

      case 'onboarding':
        // Test onboarding message generation and sending
        const onboardingMessage = generateOnboardingMessage({
          name: 'John Doe',
          schedule: [
            { date: new Date('2024-04-01'), time: '10:00' },
            { date: new Date('2024-04-08'), time: '10:00' },
            { date: new Date('2024-04-15'), time: '10:00' },
          ],
          totalSessions: 3,
        });
        result = await sendWhatsAppMessage(formattedPhone, onboardingMessage);
        break;

      case 'payment':
        // Test payment message generation and sending
        const paymentMessage = generatePaymentMessage({
          name: 'John Doe',
          amount: 5000,
          date: new Date(),
          type: 'full',
        });
        result = await sendWhatsAppMessage(formattedPhone, paymentMessage);
        break;

      case 'payment-receipt':
        // Test enhanced payment receipt generation and sending
        const receiptMessage = generatePaymentReceipt({
          name: 'John Doe',
          amount: 5000,
          date: new Date(),
          type: 'full',
          paymentMode: 'CASH',
          transactionReference: 'TXN-12345',
        });
        result = await sendWhatsAppMessage(formattedPhone, receiptMessage);
        break;

      case 'combined-onboarding-receipt':
        // Test combined onboarding + receipt message generation
        const combinedMessage = generateCombinedOnboardingAndReceipt({
          name: 'John Doe',
          schedule: [
            { date: new Date('2024-04-01'), time: '10:00' },
            { date: new Date('2024-04-08'), time: '10:00' },
            { date: new Date('2024-04-15'), time: '10:00' },
          ],
          totalSessions: 3,
          paymentAmount: 5000,
          paymentMode: 'CASH',
          transactionReference: 'TXN-12345',
        });
        result = await sendWhatsAppMessage(formattedPhone, combinedMessage);
        break;

      case 'service-onboarding':
        // Test the full onboarding service
        result = await sendOnboardingWhatsApp({
          id: 'test-client-id',
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: formattedPhone,
          plan: {
            numberOfSessions: 3,
            joiningDate: '2024-04-01',
            joiningTime: '10:00',
          },
          sessions: [
            { sessionDate: '2024-04-01', startTime: '10:00' },
            { sessionDate: '2024-04-08', startTime: '10:00' },
            { sessionDate: '2024-04-15', startTime: '10:00' },
          ],
        });
        break;

      case 'service-payment':
        // Test the full payment service
        result = await sendPaymentWhatsApp(
          {
            id: 'test-client-id',
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: formattedPhone,
          },
          {
            amount: 5000,
            date: new Date(),
            type: 'full',
          }
        );
        break;

      case 'service-payment-receipt':
        // Test the enhanced payment receipt service
        result = await sendPaymentReceiptWhatsApp(
          {
            id: 'test-client-id',
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: formattedPhone,
          },
          {
            amount: 5000,
            date: new Date(),
            type: 'full',
            paymentMode: 'CASH',
            transactionReference: 'TXN-12345',
            totalAmount: 5000,
            remainingAmount: 0,
          }
        );
        break;

      case 'service-onboarding-with-receipt':
        // Test the combined onboarding + receipt service
        result = await sendOnboardingWithReceiptWhatsApp({
          id: 'test-client-id',
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: formattedPhone,
          plan: {
            numberOfSessions: 3,
            joiningDate: '2024-04-01',
            joiningTime: '10:00',
          },
          sessions: [
            { sessionDate: '2024-04-01', startTime: '10:00' },
            { sessionDate: '2024-04-08', startTime: '10:00' },
            { sessionDate: '2024-04-15', startTime: '10:00' },
          ],
          payment: {
            amount: 5000,
            paymentMode: 'CASH',
            transactionReference: 'TXN-12345',
          },
          vehicleDetails: {
            name: 'Honda City',
            number: 'MH-12-AB-1234',
            type: 'Sedan',
          },
        });
        break;

      case 'comprehensive-onboarding':
        // Test the comprehensive onboarding message generation
        const comprehensiveMessage = generateComprehensiveOnboardingMessage({
          name: 'John Doe',
          schedule: [
            { date: new Date('2024-04-01'), time: '10:00' },
            { date: new Date('2024-04-08'), time: '10:00' },
            { date: new Date('2024-04-15'), time: '10:00' },
          ],
          totalSessions: 3,
          vehicleDetails: {
            name: 'Honda City',
            number: 'MH-12-AB-1234',
            type: 'Sedan',
          },
          paymentAmount: 5000,
          paymentMode: 'CASH',
          transactionReference: 'TXN-12345',
          totalAmount: 5000,
          remainingAmount: 0,
        });
        result = await sendWhatsAppMessage(formattedPhone, comprehensiveMessage);
        break;

      default:
        return NextResponse.json({ error: 'Invalid test type' }, { status: 400 });
    }

    return NextResponse.json({
      success: result.success,
      testType,
      message: result.success ? 'Test message sent successfully' : 'Test failed',
      error: result.error,
    });
  } catch (error) {
    console.error('WhatsApp integration test error:', error);
    return NextResponse.json({ error: 'Failed to run WhatsApp test' }, { status: 500 });
  }
}

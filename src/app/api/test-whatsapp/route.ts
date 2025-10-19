import { NextRequest, NextResponse } from 'next/server';
import { sendTextMessage } from '@/lib/whatsapp/core/client';
import { isValidPhone, formatPhoneForWhatsApp } from '@/lib/whatsapp/utils/phone';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message } = await request.json();

    console.log('🧪 [WhatsApp Test] Testing WhatsApp message sending');
    console.log('🧪 [WhatsApp Test] Phone:', phoneNumber);
    console.log('🧪 [WhatsApp Test] Message:', message);

    // Validate phone number
    if (!isValidPhone(phoneNumber)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid phone number format',
        phoneNumber,
      });
    }

    // Format phone number for WhatsApp
    const formattedPhone = formatPhoneForWhatsApp(phoneNumber);
    console.log('🧪 [WhatsApp Test] Formatted phone:', formattedPhone);

    // Send message
    const result = await sendTextMessage(formattedPhone, message);

    console.log('🧪 [WhatsApp Test] Result:', result);

    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      phoneNumber: formattedPhone,
    });
  } catch (error) {
    console.error('🧪 [WhatsApp Test] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

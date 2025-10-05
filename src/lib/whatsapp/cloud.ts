export async function sendWhatsAppMessage(to: string, body: string) {
  const token = process.env.WHATSAPP_CLOUD_TOKEN!;
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID!;
  const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

  console.log('🌐 [WhatsApp Cloud] ===== SENDING MESSAGE =====');
  console.log('🌐 [WhatsApp Cloud] To:', to);
  console.log('🌐 [WhatsApp Cloud] Phone Number ID:', phoneNumberId);
  console.log('🌐 [WhatsApp Cloud] Token exists:', !!token);
  console.log(
    '🌐 [WhatsApp Cloud] Token preview:',
    token ? `${token.substring(0, 10)}...` : 'NOT SET'
  );
  console.log('🌐 [WhatsApp Cloud] Message length:', body.length);
  console.log(
    '🌐 [WhatsApp Cloud] Message preview:',
    body.substring(0, 100) + (body.length > 100 ? '...' : '')
  );

  // Validate phone number format
  if (!/^91[6-9]\d{9}$/.test(to)) {
    console.error('❌ [WhatsApp Cloud] Invalid phone format:', to);
    console.error('❌ [WhatsApp Cloud] Expected format: 91XXXXXXXXXX (11 digits starting with 91)');
    return { success: false, error: 'Invalid phone number format' };
  }

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body },
  };

  console.log('🌐 [WhatsApp Cloud] Payload:', JSON.stringify(payload, null, 2));

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log('🌐 [WhatsApp Cloud] Response status:', res.status);
    console.log('🌐 [WhatsApp Cloud] Response headers:', Object.fromEntries(res.headers.entries()));
    console.log('🌐 [WhatsApp Cloud] Response data:', JSON.stringify(data, null, 2));

    if (!res.ok) {
      console.error('❌ [WhatsApp Cloud] API error:', data);

      // Common error handling
      if (data.error) {
        const errorCode = data.error.code;
        const errorMessage = data.error.message;

        console.error('❌ [WhatsApp Cloud] Error Code:', errorCode);
        console.error('❌ [WhatsApp Cloud] Error Message:', errorMessage);

        // Specific error handling
        switch (errorCode) {
          case 100:
            console.error('❌ [WhatsApp Cloud] Invalid parameter - check phone number format');
            break;
          case 190:
            console.error('❌ [WhatsApp Cloud] Invalid access token');
            break;
          case 368:
            console.error('❌ [WhatsApp Cloud] Temporarily blocked - rate limit exceeded');
            break;
          case 131026:
            console.error('❌ [WhatsApp Cloud] Message undeliverable - recipient not on WhatsApp');
            break;
          case 131021:
            console.error('❌ [WhatsApp Cloud] Recipient cannot be messaged');
            break;
          default:
            console.error('❌ [WhatsApp Cloud] Unknown error code:', errorCode);
        }
      }

      return { success: false, error: data };
    }

    console.log('✅ [WhatsApp Cloud] Message sent successfully');
    console.log('✅ [WhatsApp Cloud] Message ID:', data.messages?.[0]?.id);
    console.log('✅ [WhatsApp Cloud] Recipient:', data.contacts?.[0]?.wa_id);

    return { success: true, data };
  } catch (error) {
    console.error('❌ [WhatsApp Cloud] Network error:', error);
    return { success: false, error: 'Network error: ' + (error as Error).message };
  }
}

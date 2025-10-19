export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'document';
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters?: Array<{
        type: string;
        text?: string;
        document?: {
          link: string;
          filename: string;
        };
      }>;
    }>;
  };
  document?: {
    link: string;
    filename: string;
    caption?: string;
  };
}

export interface WhatsAppResponse {
  success: boolean;
  data?: {
    messages: Array<{
      id: string;
    }>;
    contacts: Array<{
      wa_id: string;
    }>;
  };
  error?: string;
}

interface WhatsAppConfig {
  token: string;
  phoneNumberId: string;
  baseUrl: string;
}

// Cache for configuration to avoid repeated imports
let configCache: WhatsAppConfig | null = null;

async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  if (configCache) return configCache;

  const { env } = await import('@/env');

  if (!env.WHATSAPP_CLOUD_TOKEN || !env.WHATSAPP_CLOUD_PHONE_NUMBER_ID) {
    throw new Error('WhatsApp Cloud API credentials not configured');
  }

  configCache = {
    token: env.WHATSAPP_CLOUD_TOKEN,
    phoneNumberId: env.WHATSAPP_CLOUD_PHONE_NUMBER_ID,
    baseUrl: `https://graph.facebook.com/v22.0/${env.WHATSAPP_CLOUD_PHONE_NUMBER_ID}/messages`,
  };

  return configCache;
}

function isValidPhoneFormat(phone: string): boolean {
  // Indian phone number format: 91XXXXXXXXXX (11 digits starting with 91)
  return /^91[6-9]\d{9}$/.test(phone);
}

export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
  console.log('🌐 [WhatsApp] Sending message to:', message.to);
  console.log('🌐 [WhatsApp] Message type:', message.type);

  // Validate phone number format
  if (!isValidPhoneFormat(message.to)) {
    console.error('❌ [WhatsApp] Invalid phone format:', message.to);
    return {
      success: false,
      error: 'Invalid phone number format. Expected: 91XXXXXXXXXX',
    };
  }

  try {
    const config = await getWhatsAppConfig();

    const payload = {
      messaging_product: 'whatsapp',
      ...message,
    };

    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ [WhatsApp] API error:', data);
      return { success: false, error: data };
    }

    console.log('✅ [WhatsApp] Message sent successfully');
    console.log('✅ [WhatsApp] Message ID:', data.messages?.[0]?.id);

    return { success: true, data };
  } catch (error) {
    console.error('❌ [WhatsApp] Network error:', error);
    return {
      success: false,
      error: 'Network error: ' + (error as Error).message,
    };
  }
}

export async function sendTextMessage(to: string, body: string): Promise<WhatsAppResponse> {
  return sendWhatsAppMessage({
    to,
    type: 'text',
    text: { body },
  });
}

export async function sendDocument(
  to: string,
  documentUrl: string,
  filename: string,
  caption?: string
): Promise<WhatsAppResponse> {
  return sendWhatsAppMessage({
    to,
    type: 'document',
    document: {
      link: documentUrl,
      filename,
      caption,
    },
  });
}

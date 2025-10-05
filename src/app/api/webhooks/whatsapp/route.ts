import { NextRequest, NextResponse } from 'next/server';

// WhatsApp webhook verification and message status handling
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log('📱 [WhatsApp Webhook] Verification request:', { mode, token, challenge });

  // Verify the webhook
  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ [WhatsApp Webhook] Verification successful');
    return new NextResponse(challenge, { status: 200 });
  }

  console.log('❌ [WhatsApp Webhook] Verification failed');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📱 [WhatsApp Webhook] Received webhook:', JSON.stringify(body, null, 2));

    // Handle different webhook events
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            await handleMessageStatus(change.value);
          }
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('❌ [WhatsApp Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

interface WhatsAppWebhookValue {
  statuses?: Array<{
    id: string;
    recipient_id: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: string;
    errors?: Array<{ code: number; title: string; message: string }>;
  }>;
  messages?: Array<{
    from: string;
    type: string;
    id: string;
    text?: { body: string };
  }>;
}

async function handleMessageStatus(value: WhatsAppWebhookValue) {
  console.log('📱 [WhatsApp Webhook] Processing message status:', JSON.stringify(value, null, 2));

  // Handle message status updates
  if (value.statuses) {
    for (const status of value.statuses) {
      console.log('📱 [WhatsApp Webhook] Message status update:');
      console.log('📱 [WhatsApp Webhook] - Message ID:', status.id);
      console.log('📱 [WhatsApp Webhook] - Recipient:', status.recipient_id);
      console.log('📱 [WhatsApp Webhook] - Status:', status.status);
      console.log('📱 [WhatsApp Webhook] - Timestamp:', status.timestamp);

      // Log different status types
      switch (status.status) {
        case 'sent':
          console.log('✅ [WhatsApp Webhook] Message sent successfully');
          break;
        case 'delivered':
          console.log('✅ [WhatsApp Webhook] Message delivered to recipient');
          break;
        case 'read':
          console.log('✅ [WhatsApp Webhook] Message read by recipient');
          break;
        case 'failed':
          console.log('❌ [WhatsApp Webhook] Message failed to send');
          if (status.errors) {
            console.log('❌ [WhatsApp Webhook] Error details:', status.errors);
          }
          break;
        default:
          console.log('📱 [WhatsApp Webhook] Unknown status:', status.status);
      }
    }
  }

  // Handle incoming messages (if any)
  if (value.messages) {
    for (const message of value.messages) {
      console.log('📱 [WhatsApp Webhook] Incoming message:');
      console.log('📱 [WhatsApp Webhook] - From:', message.from);
      console.log('📱 [WhatsApp Webhook] - Type:', message.type);
      console.log('📱 [WhatsApp Webhook] - Message ID:', message.id);

      if (message.text) {
        console.log('📱 [WhatsApp Webhook] - Text:', message.text.body);
      }
    }
  }
}

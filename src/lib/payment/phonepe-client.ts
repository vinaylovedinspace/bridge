import { env } from '@/env';

const PHONEPE_BASE_URL =
  env.PHONEPE_ENV === 'PRODUCTION'
    ? 'https://api.phonepe.com/apis/pg'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

const PHONEPE_OAUTH_URL =
  env.PHONEPE_ENV === 'PRODUCTION'
    ? 'https://api.phonepe.com/apis/identity-manager'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type PaymentResponse = {
  redirectUrl: string;
};

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get OAuth token for PhonePe API
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if valid
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const authString = `${env.PHONEPE_CLIENT_ID}:${env.PHONEPE_CLIENT_SECRET}`;
  const authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;

  const response = await fetch(`${PHONEPE_OAUTH_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PhonePe OAuth failed: ${response.status} - ${error}`);
  }

  const data: TokenResponse = await response.json();

  // Cache token (expires_in is in seconds)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // 60s buffer
  };

  return data.access_token;
}

/**
 * Create PhonePe payment
 */
export async function createPhonePePayment(params: {
  merchantOrderId: string;
  amount: number; // in rupees
  redirectUrl: string;
}): Promise<{ redirectUrl: string }> {
  const token = await getAccessToken();

  // PhonePe expects amount in paise
  const amountInPaise = params.amount * 100;

  const requestBody = {
    merchantOrderId: params.merchantOrderId,
    amount: amountInPaise,
    redirectUrl: params.redirectUrl,
  };

  const response = await fetch(`${PHONEPE_BASE_URL}/checkout/v2/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Client-Id': env.PHONEPE_CLIENT_ID,
      'X-Client-Version': env.PHONEPE_CLIENT_VERSION.toString(),
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PhonePe payment creation failed: ${response.status} - ${error}`);
  }

  const data: PaymentResponse = await response.json();
  return data;
}

/**
 * Get PhonePe order status
 */
export async function getPhonePeOrderStatus(merchantOrderId: string, details = false) {
  const token = await getAccessToken();

  const url = new URL(`${PHONEPE_BASE_URL}/checkout/v2/order/${merchantOrderId}/status`);
  if (details) {
    url.searchParams.set('details', 'true');
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Client-Id': env.PHONEPE_CLIENT_ID,
      'X-Client-Version': env.PHONEPE_CLIENT_VERSION.toString(),
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PhonePe order status check failed: ${response.status} - ${error}`);
  }

  return await response.json();
}

/**
 * Validate PhonePe callback
 */
export function validatePhonePeCallback(
  username: string,
  password: string,
  authorization: string
): boolean {
  // Create expected signature
  const expectedAuth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

  // Verify authorization header matches
  if (authorization !== expectedAuth) {
    return false;
  }

  // Additional validation can be added here
  return true;
}

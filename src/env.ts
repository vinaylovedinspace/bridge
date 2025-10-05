import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    POSTGRES_URL: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
    // Cashfree Payment Gateway
    CASHFREE_CLIENT_ID: z.string().min(1),
    CASHFREE_CLIENT_SECRET: z.string().min(1),
    CASHFREE_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
    CRON_SECRET: z.string().min(1),
    UPSTASH_REDIS_REST_URL: z.string().min(1),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    // WhatsApp Cloud API
    WHATSAPP_CLOUD_TOKEN: z.string().min(1),
    WHATSAPP_CLOUD_PHONE_NUMBER_ID: z.string().min(1),
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  },
  // For Next.js >= 13.4.4, you only need to destructure client variables
  experimental__runtimeEnv: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

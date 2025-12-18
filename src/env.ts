import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    POSTGRES_URL: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
    CRON_SECRET: z.string().min(1),
    SUREPASS_API_TOKEN: z.string().min(1),
    SUREPASS_BASE_URL: z.string().url().default('https://kyc-api.surepass.app'),
    QSTASH_TOKEN: z.string().min(1),
    QSTASH_URL: z.string().url(),
    QSTASH_CURRENT_SIGNING_KEY: z.string().min(1),
    QSTASH_NEXT_SIGNING_KEY: z.string().min(1),
    BLOB_READ_WRITE_TOKEN: z.string().min(1),
    PHONEPE_CLIENT_ID: z.string().min(1),
    PHONEPE_CLIENT_SECRET: z.string().min(1),
    PHONEPE_CLIENT_VERSION: z.coerce.number().default(1),
    PHONEPE_ENV: z.enum(['PRODUCTION', 'SANDBOX']).default('SANDBOX'),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  },
  // For Next.js >= 13.4.4, you only need to destructure client variables
  experimental__runtimeEnv: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

import { env } from '@/env';

/**
 * Gets the appropriate base URL for workflow endpoints based on environment.
 *
 * In local development:
 * - Uses localhost URLs that can be handled by QStash CLI dev server
 * - Requires running: npx @upstash/qstash-cli dev
 *
 * In production:
 * - Uses the public app URL from environment variables
 */
export function getWorkflowBaseUrl(): string {
  const isLocalhost =
    env.NEXT_PUBLIC_APP_URL.includes('localhost') || env.NEXT_PUBLIC_APP_URL.includes('127.0.0.1');

  if (isLocalhost) {
    // Use local URL for QStash CLI dev server
    return 'http://localhost:3000';
  }

  return env.NEXT_PUBLIC_APP_URL;
}

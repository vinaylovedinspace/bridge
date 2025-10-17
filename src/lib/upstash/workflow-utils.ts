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

/**
 * Checks if workflows should be enabled in the current environment.
 * Workflows are disabled in local development if QStash CLI is not running.
 */
export function shouldEnableWorkflows(): boolean {
  // Always enable in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    return true;
  }

  // In development, check if QSTASH_URL is configured for local dev
  // If not configured, workflows are disabled
  return !!env.QSTASH_URL;
}

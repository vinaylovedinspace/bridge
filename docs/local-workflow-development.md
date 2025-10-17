# Local Workflow Development

This guide explains how to develop and test Upstash Workflows locally.

## Overview

By default, workflows are disabled in local development because QStash cannot reach localhost URLs. To enable workflows locally, you need to run the QStash CLI development server.

## Quick Start

### 1. Install QStash CLI

The CLI is included as a dev dependency, but you can also install it globally:

```bash
npm install -g @upstash/qstash-cli
```

### 2. Start the QStash Dev Server

In a separate terminal, run:

```bash
npx @upstash/qstash-cli dev
```

This will:

- Start a local QStash server on `http://127.0.0.1:8080`
- Provide you with temporary credentials
- Proxy workflow requests to your local Next.js app

### 3. Configure Environment Variables

Create or update your `.env.local` file with the credentials provided by the CLI:

```env
# QStash Local Development
QSTASH_URL=http://127.0.0.1:8080
QSTASH_CURRENT_SIGNING_KEY=sig_xxxxx
QSTASH_NEXT_SIGNING_KEY=sig_xxxxx
```

**Important:** Keep your production `QSTASH_TOKEN` in `.env.local` as well.

### 4. Start Your Next.js App

```bash
bun dev
```

Workflows will now trigger successfully in local development!

## Workflow Behavior

### Without QStash CLI Running

When workflows are triggered without the QStash CLI running, you'll see log messages like:

```
[DEV] Workflows disabled for session abc-123. Run 'npx @upstash/qstash-cli dev' to enable.
```

The application will continue to work normally, but workflows won't execute.

### With QStash CLI Running

When the CLI is running and environment variables are configured:

- Workflows trigger normally
- You can monitor workflow runs in real-time
- Workflow logs appear in the CLI output
- You can debug workflow execution

## Available Workflows

The application uses these workflows:

1. **Session Status Workflow** (`/api/workflows/session-status`)

   - Sends WhatsApp reminders 1 hour before session
   - Updates session status to IN_PROGRESS at start time
   - Updates session status to COMPLETED at end time

2. **Payment Notification** (`/api/workflows/payment-notification`)

   - Sends in-app notification when payment is received

3. **DL Test Eligibility** (`/api/workflows/dl-test-eligibility`)

   - Notifies when client is eligible for driving test (30 days after LL issue)

4. **Vehicle Document Expiry** (`/api/workflows/vehicle-document-expiry`)
   - Sends notifications at 30, 7, and 1 day before document expiry

## Debugging Workflows

### Enable Local Mode in Upstash Console

1. Go to [Upstash Console](https://console.upstash.com)
2. Navigate to the Workflow tab
3. Enable "Local Mode"
4. Monitor workflow runs and debug execution

### Check Workflow Logs

The QStash CLI shows all workflow activity:

```bash
npx @upstash/qstash-cli dev
# Watch for workflow triggers and execution
```

### Verify Configuration

Check that workflows are enabled:

```typescript
import { shouldEnableWorkflows } from '@/lib/upstash/workflow-utils';

console.log('Workflows enabled:', shouldEnableWorkflows());
```

## Production vs Development

### Development (without QStash CLI)

- Workflows are disabled
- App functions normally without workflow execution
- Logs show `[DEV]` messages

### Development (with QStash CLI)

- Workflows execute locally
- Full debugging capabilities
- Simulates production behavior

### Production

- Workflows always enabled
- QStash routes requests to public URL
- No special configuration needed

## Troubleshooting

### Workflows Still Not Working

1. Verify QStash CLI is running in a separate terminal
2. Check that `.env.local` has `QSTASH_URL` set
3. Restart your Next.js dev server after adding env vars
4. Check QStash CLI output for errors

### Environment Variable Not Found

The `QSTASH_URL`, `QSTASH_CURRENT_SIGNING_KEY`, and `QSTASH_NEXT_SIGNING_KEY` variables are optional. If not set, workflows are disabled in development.

### Port Conflicts

If port 8080 is in use, the QStash CLI will use a different port. Update `QSTASH_URL` in your `.env.local` accordingly.

## References

- [Upstash Workflow Documentation](https://upstash.com/docs/workflow)
- [Local Development Guide](https://upstash.com/docs/workflow/howto/local-development/development-server)
- [QStash CLI GitHub](https://github.com/upstash/qstash-cli)

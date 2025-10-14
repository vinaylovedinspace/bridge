# Session Status Workflow

Automated session status management using Upstash Workflow.

## Overview

When a session is created with status `SCHEDULED`, a workflow is automatically triggered that:

1. **Sleeps until 1 hour before session** → Sends WhatsApp reminder to student
2. **Sleeps until session start time** → Updates status to `IN_PROGRESS`
3. **Sleeps until session end time** → Updates status to `COMPLETED`

## Setup

### 1. Get QStash Token

1. Go to [Upstash Console](https://console.upstash.com/qstash)
2. Copy your `QSTASH_TOKEN`
3. Add it to your `.env` file:

```env
QSTASH_TOKEN=your_qstash_token_here
```

### 2. Deploy Your Application

The workflow endpoint is available at:

```
POST /api/workflows/session-status
```

Upstash needs to be able to reach this endpoint, so your application must be deployed (Vercel, etc.).

For local development, use a tunnel like [ngrok](https://ngrok.com/) or Vercel's local development workflow.

## How It Works

### Automatic Triggering

Workflows are triggered automatically when sessions are created or scheduled via:

- `createSessions()` - When creating new sessions
- `assignSessionToSlot()` - When assigning a cancelled session to a new slot
- `updateScheduledSessionsForClient()` - When updating client sessions

### Validation

Before each action, the workflow validates:

**For Reminder:**

- ✅ Session still exists (not deleted)
- ✅ Session is `SCHEDULED`
- ✅ Client has a phone number

**For Status Updates:**

- ✅ Session still exists (not deleted)
- ✅ Session is in the expected status
  - For `IN_PROGRESS`: Must be `SCHEDULED`
  - For `COMPLETED`: Must be `IN_PROGRESS`

If validation fails, the action is skipped and a warning is logged.

## File Structure

```
src/
├── app/api/workflows/session-status/
│   └── route.ts                          # Workflow endpoint
├── lib/
│   ├── upstash/
│   │   ├── workflow.ts                    # QStash client
│   │   └── trigger-session-workflow.ts    # Helper to trigger workflows
│   └── whatsapp/
│       └── send-session-reminder.ts       # WhatsApp reminder (TODO: implement)
└── server/db/
    └── sessions.ts                        # Session CRUD with workflow triggers
```

## Monitoring

Workflows can be monitored in the [Upstash Console](https://console.upstash.com/qstash):

- View all running workflows
- Check workflow execution logs
- See failed workflows and retry them

## Edge Cases

### Manual Status Updates

If a session status is manually updated (e.g., marked as `CANCELLED` or `NO_SHOW`), the workflow will still run but will skip the status update due to validation.

### Rescheduled Sessions

When sessions are rescheduled, the old workflow continues but won't update the status (validation fails). A new workflow is triggered for the rescheduled session.

### Deleted Sessions

If a session is soft-deleted (`deletedAt` is set), the workflow will skip status updates.

## WhatsApp Reminders

The workflow sends WhatsApp reminders 1 hour before each session. The implementation is in [src/lib/whatsapp/send-session-reminder.ts](../src/lib/whatsapp/send-session-reminder.ts).

**Current Status:** Placeholder function (logs to console)

**TODO:** Implement actual WhatsApp messaging using WhatsApp Business API or a service like Twilio.

## Cost

Upstash QStash free tier includes:

- **1M steps/month** (plenty for most use cases)
- Each workflow uses 3 steps (reminder + 2 status updates)
- ~333K sessions can be processed per month on free tier

## Local Development

For local testing, you can:

1. Use [ngrok](https://ngrok.com/) to tunnel your local server
2. Or use Vercel's development workflow with `vercel dev --listen 3000`
3. Set `NEXT_PUBLIC_APP_URL` to your tunnel URL in `.env`

## Troubleshooting

### Workflow not triggering

- Check that `QSTASH_TOKEN` is set correctly
- Verify `NEXT_PUBLIC_APP_URL` points to a publicly accessible URL
- Check Upstash Console for failed workflow runs

### Status not updating

- Check workflow logs in Upstash Console
- Verify session exists and is in expected status
- Look for validation warnings in application logs

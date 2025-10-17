import { Client as QstashClient } from '@upstash/qstash';
import { Client as WorkflowClient } from '@upstash/workflow';
import { env } from '@/env';

export const workflowClient = new WorkflowClient({
  token: env.QSTASH_TOKEN,
  baseUrl: env.QSTASH_URL,
});
export const qstashClient = new QstashClient({ token: env.QSTASH_TOKEN, baseUrl: env.QSTASH_URL });

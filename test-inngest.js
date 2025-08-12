// Test script to verify Inngest configuration
import { env } from './src/env.ts';

console.log('Testing Inngest environment variables:');
console.log('INNGEST_EVENT_KEY:', env.INNGEST_EVENT_KEY ? '✓ Set' : '✗ Missing');
console.log('INNGEST_SIGNING_KEY:', env.INNGEST_SIGNING_KEY ? '✓ Set' : '✗ Missing');

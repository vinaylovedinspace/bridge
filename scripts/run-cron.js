#!/usr/bin/env node

/**
 * Simple script to run cron jobs locally
 * Usage: node scripts/run-cron.js [evening|morning]
 */

const CRON_SECRET = process.env.CRON_SECRET || 'notifications_cron_secret_key_2024';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runCronJob(type) {
  const endpoint = `${BASE_URL}/api/cron/session-reminders/${type}`;

  console.log(`🚀 Running ${type} cron job...`);
  console.log(`📍 ${endpoint}`);
  console.log('⏳ Please wait...\n');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS!');
      console.log(`📊 Sessions found: ${data.sessionsFound}`);
      console.log(`📨 Reminders sent: ${data.remindersSent}`);
      console.log(`❌ Failed reminders: ${data.remindersFailed}`);

      if (data.message) {
        console.log(`💬 ${data.message}`);
      }
    } else {
      console.log('❌ FAILED!');
      console.log(`Status: ${response.status}`);
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error(`💥 Error running ${type} cron job:`);
    console.error(error.message);

    if (error.cause?.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your development server is running:');
      console.log('   bun dev');
    }
  }
}

function showUsage() {
  console.log('📝 Usage: node scripts/run-cron.js [evening|morning]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/run-cron.js evening   # Test evening reminder cron');
  console.log('  node scripts/run-cron.js morning   # Test morning reminder cron');
  console.log('');
  console.log('Environment variables:');
  console.log(`  BASE_URL=${BASE_URL}`);
  console.log(`  CRON_SECRET=${CRON_SECRET.substring(0, 10)}...`);
}

async function main() {
  const type = process.argv[2];

  if (!type) {
    showUsage();
    return;
  }

  if (!['evening', 'morning'].includes(type)) {
    console.error('❌ Invalid type. Use: evening or morning');
    showUsage();
    process.exit(1);
  }

  await runCronJob(type);
}

main().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});

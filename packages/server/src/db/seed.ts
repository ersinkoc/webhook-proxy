import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateApiKey(): string {
  return `whp_${crypto.randomBytes(24).toString('hex')}`;
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@webhook-proxy.oxog.net' },
    update: {},
    create: {
      email: 'demo@webhook-proxy.oxog.net',
      apiKey: generateApiKey(),
    },
  });

  console.log(`✅ Created demo user: ${demoUser.email}`);

  // Create sample endpoints
  const endpoints = await Promise.all([
    prisma.endpoint.create({
      data: {
        name: 'GitHub Webhooks',
        slug: nanoid(8),
        targetUrl: 'http://localhost:4000/github',
        apiKey: generateApiKey(),
        userId: demoUser.id,
      },
    }),
    prisma.endpoint.create({
      data: {
        name: 'Stripe Events',
        slug: nanoid(8),
        targetUrl: 'http://localhost:4000/stripe',
        apiKey: generateApiKey(),
        userId: demoUser.id,
      },
    }),
    prisma.endpoint.create({
      data: {
        name: 'Slack Notifications',
        slug: nanoid(8),
        targetUrl: 'http://localhost:4000/slack',
        apiKey: generateApiKey(),
        userId: demoUser.id,
        isActive: false,
      },
    }),
  ]);

  console.log(`✅ Created ${endpoints.length} sample endpoints`);

  // Create sample webhooks
  const sampleWebhooks = [
    {
      endpointId: endpoints[0].id,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'push',
        'x-github-delivery': crypto.randomUUID(),
      },
      body: {
        ref: 'refs/heads/main',
        repository: { name: 'example-repo', full_name: 'user/example-repo' },
        pusher: { name: 'John Doe', email: 'john@example.com' },
      },
      statusCode: 200,
      response: { success: true },
      deliveredAt: new Date(),
      duration: 142,
    },
    {
      endpointId: endpoints[1].id,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'whsec_test_secret',
      },
      body: {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_1234567890',
            amount: 2000,
            currency: 'usd',
          },
        },
      },
      statusCode: 200,
      response: { received: true },
      deliveredAt: new Date(),
      duration: 98,
    },
    {
      endpointId: endpoints[0].id,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'pull_request',
      },
      body: {
        action: 'opened',
        pull_request: { title: 'Fix bug in authentication', number: 42 },
      },
      statusCode: 500,
      error: 'Internal server error',
      deliveredAt: new Date(),
      duration: 523,
    },
  ];

  await prisma.webhook.createMany({
    data: sampleWebhooks,
  });

  console.log(`✅ Created ${sampleWebhooks.length} sample webhooks`);
  console.log('\n🎉 Database seed completed!');
  console.log(`\n📝 Demo API Key: ${demoUser.apiKey}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
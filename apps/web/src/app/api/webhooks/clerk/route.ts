import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { prisma } from '@xsite/db';

/**
 * POST /api/webhooks/clerk
 *
 * Clerk sends user/organization lifecycle events here (configure this URL
 * in the Clerk dashboard's Webhooks page once a Clerk application exists).
 * Verifies the svix signature headers against CLERK_WEBHOOK_SECRET — this
 * is the ONLY path that creates/updates our own `users`/`organizations`/
 * `organization_memberships` rows from Clerk state; nothing else guesses at
 * user identity from a client-supplied field.
 *
 * Idempotent: re-delivery of the same event just re-applies the same
 * upsert, which is safe.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: { code: 'webhook_not_configured', message: 'CLERK_WEBHOOK_SECRET is not set.' } },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: { code: 'missing_svix_headers', message: 'Missing svix headers.' } }, { status: 400 });
  }

  let event: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(secret);
    event = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as { type: string; data: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: { code: 'invalid_signature', message: 'Webhook signature verification failed.' } }, { status: 400 });
  }

  switch (event.type) {
    case 'user.created':
    case 'user.updated': {
      const data = event.data as { id: string; email_addresses?: Array<{ email_address: string }>; first_name?: string; last_name?: string };
      const email = data.email_addresses?.[0]?.email_address;
      if (email) {
        await prisma.user.upsert({
          where: { authSubject: data.id },
          create: {
            authSubject: data.id,
            email,
            name: [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined,
          },
          update: { email, name: [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined },
        });
      }
      break;
    }
    case 'organization.created':
    case 'organization.updated': {
      const data = event.data as { id: string; name: string; slug: string };
      await prisma.organization.upsert({
        where: { slug: data.slug },
        create: { slug: data.slug, name: data.name },
        update: { name: data.name },
      });
      break;
    }
    case 'organizationMembership.created': {
      const data = event.data as {
        organization: { id: string; slug: string };
        public_user_data: { user_id: string };
        role: string;
      };
      const [user, organization] = await Promise.all([
        prisma.user.findUnique({ where: { authSubject: data.public_user_data.user_id } }),
        prisma.organization.findUnique({ where: { slug: data.organization.slug } }),
      ]);
      if (user && organization) {
        const role = data.role.includes('admin') ? 'admin' : data.role.includes('owner') ? 'owner' : 'member';
        await prisma.organizationMembership.upsert({
          where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
          create: { userId: user.id, organizationId: organization.id, role },
          update: { role },
        });
      }
      break;
    }
    default:
      // Unhandled event types are acknowledged, not treated as errors — Clerk
      // sends many event kinds this integration doesn't need yet.
      break;
  }

  return NextResponse.json({ received: true });
}

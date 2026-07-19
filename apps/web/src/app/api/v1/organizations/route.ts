import { NextResponse } from 'next/server';
import { createOrganization, prisma } from '@xsite/db';
import { isClerkConfigured } from '@/lib/auth/config';
import { isDemoMode } from '@/lib/env';
import { toErrorResponse } from '@/lib/api-errors';

interface CreateOrganizationBody {
  name: string;
  slug: string;
  country?: string;
  defaultLocale?: string;
  /** Demo-mode only — see the isDemoMode() branch below. Ignored when Clerk is configured. */
  ownerEmail?: string;
}

async function resolveCreatingUserId(body: CreateOrganizationBody): Promise<string> {
  if (isClerkConfigured()) {
    const { auth } = await import('@clerk/nextjs/server');
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) throw new Error('unauthenticated');
    const user = await prisma.user.findUniqueOrThrow({ where: { authSubject: clerkUserId } });
    return user.id;
  }
  if (!isDemoMode()) throw new Error('Neither Clerk nor demo mode is configured — cannot resolve a user.');
  if (!body.ownerEmail) throw new Error('ownerEmail is required in demo mode (no Clerk session to resolve a user from).');
  const user = await prisma.user.upsert({
    where: { email: body.ownerEmail },
    create: { email: body.ownerEmail },
    update: {},
  });
  return user.id;
}

/** POST /api/v1/organizations — create an organization; the caller becomes its owner. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as CreateOrganizationBody;
    if (!body.name || !body.slug) {
      return NextResponse.json({ error: { code: 'invalid_body', message: 'name and slug are required.' } }, { status: 422 });
    }
    const ownerUserId = await resolveCreatingUserId(body);
    const organization = await createOrganization({
      name: body.name,
      slug: body.slug,
      ownerUserId,
      ...(body.country !== undefined ? { country: body.country } : {}),
      ...(body.defaultLocale !== undefined ? { defaultLocale: body.defaultLocale } : {}),
    });
    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

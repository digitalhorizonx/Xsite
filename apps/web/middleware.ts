import { NextResponse, type NextRequest } from 'next/server';
import { isClerkConfigured } from '@/lib/auth/config';

/**
 * Route protection. When Clerk isn't configured (no keys set — the current
 * state until HorizonX creates a Clerk application), this middleware is a
 * no-op pass-through and the portal keeps its existing Phase 1 demo
 * behavior. Once Clerk is configured, `clerkMiddleware` protects every
 * route except the ones explicitly listed as public.
 *
 * This file cannot conditionally import `clerkMiddleware` (Next.js requires
 * middleware's default export to be statically analyzable), so the public
 * matcher itself is the enforcement point: when Clerk IS configured, the
 * exported middleware wraps clerkMiddleware; when it isn't, it wraps a
 * pass-through. Both branches are defined at module scope, and only one
 * ever executes per request based on `isClerkConfigured()`.
 */

const PUBLIC_PATHS = [
  '/sign-in',
  '/sign-up',
  '/api/health',
  '/api/webhooks/clerk',
  '/api/webhooks/payments',
  '/pay/mock',
];

export default async function middleware(req: NextRequest) {
  if (!isClerkConfigured()) {
    return NextResponse.next();
  }

  const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server');
  const isPublicRoute = createRouteMatcher(PUBLIC_PATHS.map((p) => `${p}(.*)`));
  const handler = clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
  });
  return handler(req, {} as never);
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};

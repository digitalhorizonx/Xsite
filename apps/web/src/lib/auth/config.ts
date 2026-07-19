/**
 * Whether Clerk is actually configured in this environment. Until HorizonX
 * creates a Clerk application and sets real keys, this is false and the
 * portal runs in its existing unauthenticated demo mode (Phase 1 behavior)
 * — never a fake "signed in" state. `requireProductionEnv()`
 * (apps/web/src/lib/env.ts) fails startup in production if these are
 * missing, so this fallback can only ever be reached in development.
 */
export function isClerkConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

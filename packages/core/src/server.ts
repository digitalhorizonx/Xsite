/**
 * Server-only surface of @xsite/core.
 *
 * Import from '@xsite/core/server' — never '@xsite/core' — for anything
 * that depends on Node built-ins (here: `node:crypto` for PayTabs IPN
 * signature verification). Client Components must never import this path;
 * doing so would try to bundle Node built-ins for the browser and fail the
 * build (which is exactly the bug this split fixes — see git history).
 */
export * from './payments/paytabs-provider';

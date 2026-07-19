// XSite domain core — public surface.
export * from './domain/types';
export * from './config/pricing.config';
export * from './pricing/engine';
export * from './scope/engine';
export * from './workflow/state-machine';
export * from './agents/catalog';
export * from './providers/types';
export * from './providers/selection';
export * from './audit/events';
export * from './auth/types';
export * from './payments/types';
export * from './payments/mock-provider';
// payments/paytabs-provider.ts uses Node's `node:crypto` and is server-only —
// it is exported from './server' (see package.json's "./server" export), NOT
// from this barrel, so client components importing @xsite/core never pull
// Node built-ins into the browser bundle.

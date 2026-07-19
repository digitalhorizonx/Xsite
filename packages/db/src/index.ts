export { prisma } from './client';
export * from './tenancy';
export * as mapping from './mapping';
export * from './repositories/organizations';
export * from './repositories/audit';
export * from './repositories/projects';
export * from './repositories/quotes';
export * from './repositories/workflow';
export * from './repositories/payments';
// NOTE: repositories/internal-only.ts is intentionally NOT re-exported here.
// Import it directly (`@xsite/db/src/repositories/internal-only`) only from
// trusted internal callers — see the module's own doc comment.
export type { Prisma } from '@prisma/client';

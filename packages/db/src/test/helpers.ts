import { prisma } from '../client';

let seq = 0;
export function unique(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

export async function makeOrgWithOwner(namePrefix = 'org') {
  const email = `${unique(namePrefix)}@test.local`;
  const user = await prisma.user.create({ data: { email } });
  const organization = await prisma.organization.create({
    data: { name: unique(namePrefix), slug: unique(`${namePrefix}-slug`) },
  });
  await prisma.organizationMembership.create({
    data: { userId: user.id, organizationId: organization.id, role: 'owner' },
  });
  return { user, organization };
}

/** Deletes everything created by the test suite. Test DB only (enforced by setup.ts). */
export async function truncateAll() {
  const tables = [
    'webhook_events',
    'payment_attempts',
    'payments',
    'subscriptions',
    'change_requests',
    'workflow_transitions',
    'approval_gates',
    'proposal_approvals',
    'internal_cost_breakdowns',
    'quote_line_items',
    'quotes',
    'scope_calculations',
    'discovery_answers',
    'discovery_sessions',
    'audit_events',
    'website_projects',
    'xability_connections',
    'ecosystem_connections',
    'business_profiles',
    'organization_memberships',
    'organizations',
    'users',
  ];
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} CASCADE;`);
}

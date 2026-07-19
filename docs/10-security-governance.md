# 10 — Security & Governance Model

## Security model

- **Tenancy:** every query is organization-scoped at the data-access layer; cross-tenant access
  is structurally impossible, not endpoint discipline. Cross-agency/cross-org reads are
  forbidden.
- **Least privilege:** users get role-scoped permissions (owner/admin/member/viewer); agents
  get per-agent permission sets from the catalog; providers get task-scoped, single-repo,
  single-branch credentials. Platform-staff roles exist only for governed exception paths and
  are separately audited.
- **Secrets:** stored in a managed secret store, referenced by ID everywhere else. Never in
  code, never in client responses, never in logs (structured logging with redaction), never
  shown in the frontend. Integration configs split public config from `secret_ref`.
- **Auth:** auth-provider-agnostic session model (`auth_identity` indirection). MFA-ready.
- **Transport & data:** TLS everywhere; encryption at rest for DB and object storage; PII
  minimization in audit payloads.
- **Rate & budget limits:** API rate limits per org/user; provider spend caps per task,
  project, org, provider (hard stops with escalation, never overruns).
- **Supply chain:** locked dependency versions, CI security checks (Security Agent runs the
  same checks on client-site pipelines).

## Governance

- **Immutable audit:** every state change, approval, agent run, provider execution, secret
  access, deployment, billing action emits an insert-only `AuditEvent`. Corrections are new
  events, never edits.
- **Client approvals:** gates G1–G7 (see `docs/06-workflows.md`) are recorded decisions with
  actor, timestamp, and subject snapshot.
- **Rollbacks:** deployments are immutable and re-promotable in one step; deployment locks
  prevent concurrent deploys.
- **Backups:** scheduled backups with verification jobs; an unverified backup counts as no
  backup.
- **Incidents:** explicit incident states with timelines and client-visible status; the
  Incident Response Agent mitigates with reversible actions only.
- **Data lifecycle:** retention rules per data class; **cancellation workflow** (policy-gated,
  confirmed, never silent) and **export workflow** (client can take their data and site
  artifacts out).
- **Ownership clarity:** domain ownership and repository ownership are recorded explicitly per
  project; intellectual-property terms carry placeholders in proposals until finalized by
  legal (CLO review before public launch).
- **Client data boundaries:** Xability imports only move **approved** data; every import is
  itemized and auditable; XBrain sharing is per-product, per-category consent.

## Hard prohibitions (enforced by policy gates + agent permission boundaries)

No agent may ever:

1. Delete a production project without an approved policy workflow
2. Transfer a domain automatically without explicit client confirmation
3. Publish unapproved content
4. Modify billing silently
5. Purchase unlimited provider usage (budget caps are structural)
6. Expose credentials (to clients, logs, or other providers)
7. Disable security controls
8. Claim guaranteed SEO results (rankings, traffic, citations, AI-answer placement)
9. Fabricate integrations or completed work
10. Mark a failed test as passed
11. Bypass a required client approval

These prohibitions are encoded in the agent catalog (`permissionBoundaries`,
`approvalRequirements`) and re-checked by the workflow engine at gate evaluation — defense in
depth, not narrative policy.

# 03 — Domain Model & Database Entities

Authoritative TypeScript definitions live in `packages/core/src/domain/`. This document maps
them to the relational model (PostgreSQL). Conventions: every table has `id` (uuid),
`created_at`, `updated_at`; every tenant-scoped table has `organization_id`; soft state changes
are events, not overwrites; audit rows are immutable (insert-only).

## Identity & tenancy

| Entity | Key fields | Notes |
|---|---|---|
| `User` | email, name, locale, status | Human account. Auth provider linkage kept in `auth_identity` (provider, subject) so the auth vendor is replaceable |
| `Organization` | name, slug, country, default_locale, status | Tenant. All client data hangs off this |
| `Membership` | user_id, organization_id, role | Roles: `owner`, `admin`, `member`, `viewer` (client side); platform staff roles are separate (`platform_admin`, `platform_auditor`) and used only for governed exceptions |
| `BusinessProfile` | organization_id, legal_name, industry, description, locations[], languages[], brand assets refs, social links | Reusable across HorizonX products through XBrain |

## Ecosystem connections

| Entity | Key fields | Notes |
|---|---|---|
| `EcosystemConnection` | organization_id, product (`xability`\|`xapps`\|`xauto`\|`xai`), status (`connected`\|`not_connected`\|`pending`), external_ref, connected_at | XApps/XAuto/XAI rows allowed but inactive at launch |
| `EcosystemImport` | connection_id, kind (brand/content/audience/campaign/business_info/assets), payload_ref, approved_by, imported_at | Only **approved** Xability data is imported; every import is auditable |

## Projects & delivery

| Entity | Key fields | Notes |
|---|---|---|
| `Project` | organization_id, name, website_type, status (see state machine), current_stage, risk_level, delivery_estimate | One website = one project |
| `DiscoverySession` | project_id, answers (jsonb, versioned), completeness, missing_fields[] | Guided discovery output |
| `ScopeItem` | project_id, key, value, source (`client`\|`xability_import`\|`xbrain_inferred`), locked | Structured scope variables — the pricing-engine input |
| `Quote` | project_id, version, currency, build_price, minimum_build_price, deposit_amount, remaining_amount, monthly_plan, monthly_price, bundle_saving, third_party_costs (jsonb), included_scope[], excluded_scope[], assumptions[], risk_level, delivery_estimate, valid_until, explanation (jsonb line items), status | **Client-facing.** Never contains margins/costs |
| `QuoteInternalBreakdown` | quote_id, ai_execution_cost_est, infra_cost_est, risk_buffer, margin, formula_trace (jsonb) | **Internal only.** Separate table, separate access policy; never serialized to client APIs |
| `Proposal` | project_id, quote_id, document_ref, status, approved_at, approved_by | Approval gate G1 |
| `Task` | project_id, title, kind, acceptance_criteria[], dependencies[], assigned_provider_ref, cost_budget, time_budget, retry_count, status, validation_result, artifact_links[] | Unit of provider work; branch-isolated |
| `Artifact` | project_id, kind (brief/scope/quote/sitemap/user_journeys/content_model/page_spec/design_tokens/component_inventory/seo_plan/integration_map/acceptance_criteria/test_plan/deployment_plan/operations_plan/…), version, content_ref, produced_by (agent), superseded_by | **Every generated artifact is versioned**; artifacts are immutable, new versions supersede |
| `Approval` | project_id, gate (see approval gates), subject_ref, requested_at, decided_at, decision, decided_by, note | Client decisions are first-class records |
| `Revision` | project_id, round, items[], status | Bounded revision rounds |

## Websites in operation

| Entity | Key fields | Notes |
|---|---|---|
| `Repository` | project_id, provider_ref, url, ownership (`horizonx`\|`client`), default_branch | |
| `Environment` | project_id, kind (`preview`\|`staging`\|`production`), url, provider_ref | |
| `Deployment` | environment_id, version, status, triggered_by, artifacts, rollback_of, smoke_result | Immutable history → one-step rollback |
| `DomainRecord` | project_id, hostname, role (`primary`\|`redirect`), dns_provider_ref, verification_status, ownership_note | Domain ownership must stay explicit |
| `Integration` | project_id, category (meta_pixel/ga4/gtm/search_console/gbp/google_ads/clarity/crm/email/whatsapp/maps/booking/payment/xability/…), status, config (non-secret), secret_ref, verification_status, health, error_history ref, permissions, disconnect state | Secrets only ever by reference |
| `ChangeRequest` | project_id, source (`conversational`\|`form`), description, affected_area, classification (`included`\|`overage`\|`new_project_scope`), size (`small`\|`medium`\|`major_revision`\|`new_feature`), cost_estimate, risk_estimate, acceptance_criteria[], approval_id, task_ids[], status | Post-launch requests |
| `UsageRecord` | organization_id, project_id, period, metric (change_requests/ai_execution/bandwidth/…), quantity, plan_allowance, overage | Fair-usage accounting |
| `Incident` | project_id, severity, status, opened_by (agent/user), timeline events, resolution | |
| `MonthlyReport` | project_id, period, content_ref, recommendations[] | |

## Billing

| Entity | Key fields | Notes |
|---|---|---|
| `Subscription` | organization_id, project_id, plan (`essential`\|`growth`\|`advanced`), bundle (`xability`\|`standalone`), price, currency, status, started_at (= go-live) | Prices resolved from central pricing config at creation, stored for the record |
| `InvoiceRecord` | organization_id, kind (`deposit`\|`final`\|`subscription`\|`overage`), amount, currency, status, payment_provider_ref | Payment execution via `PaymentProvider`; **Simulated** in Phase 1 |
| `BudgetLimit` | scope (org/project/provider), metric, limit, window | Hard caps for provider spend |

## Agents, providers, audit

| Entity | Key fields | Notes |
|---|---|---|
| `AgentDefinition` | key, responsibility, allowed_inputs[], allowed_outputs[], permissions[], tools[], escalation[], retry_policy, timeout_policy, approval_requirements[], failure_behavior | Seeded from `packages/core/src/agents/catalog.ts` |
| `AgentRun` | agent_key, project_id, trigger, input_ref, output_ref, status, cost, duration, escalated_to | Every agent execution is recorded |
| `ProviderRegistration` | category, key, display_name, capabilities, status, config ref | e.g. coding: `claude_code`, `openai_codex` — internal names, never client-facing |
| `ProviderExecution` | provider_key, task_id, prompt_version, cost, latency, result_status, validation_status, quality_score | Feeds selection scoring |
| `ProviderPerformance` | provider_key, window, success_rate, avg_quality, avg_latency, avg_cost | Rolled up |
| `AuditEvent` | actor (user/agent/system), organization_id, project_id, action, subject, payload (redacted), at | **Immutable, insert-only.** Emitted for every state change, approval, provider call, secret access, deployment, billing action |

## Invariants

1. No quote without a scope; no proposal without a quote; no build without an approved
   proposal **and** deposit; no production deploy without final payment, client approval, and
   passing validation; no subscription before go-live.
2. `QuoteInternalBreakdown` is never joined into client-facing serializers.
3. Artifacts and audit events are immutable; corrections create new versions.
4. Cross-organization access is forbidden at the query layer (tenant scoping is mandatory,
   not per-endpoint discipline).
5. Every provider execution references a task with acceptance criteria and budgets.

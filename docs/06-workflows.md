# 06 — Client Journey, Workflow State Machine & Approval Gates

**Implementation:** `packages/core/src/workflow/state-machine.ts` (typed transitions + gates,
unit-tested).

## Client journey (30 steps)

1. Client creates or accesses a HorizonX account
2. Client selects XSite
3. XSite checks whether the client already uses Xability
4. If Xability exists, import approved reusable business data
5. Client completes guided discovery
6. XBrain identifies missing information
7. XBrain proposes the website type and structure
8. XBrain calculates the quotation
9. Client sees scope, build price, deposit, monthly subscription, assumptions, timeline
10. Client requests modifications or approves
11. Client pays the deposit
12. Project workspace is created
13. Agents generate requirements and acceptance criteria
14. Design direction is proposed
15. Client approves the direction
16. Build workflow begins
17. Coding providers execute isolated tasks
18. Review and QA agents validate every deliverable
19. Client reviews staging
20. Client requests bounded revisions or approves
21. Remaining build payment is collected
22. Deployment is approved
23. Domain and integrations are connected
24. Production smoke tests run
25. Website goes live
26. Monthly XSite subscription begins
27. Client manages requests through XSite
28. Agents monitor and maintain the website
29. XSite produces monthly reports and recommendations
30. Xability and XSite share approved ecosystem intelligence through XBrain

## Project status state machine

Statuses: `Draft → Discovery → Scope Review → Quote Ready → Awaiting Approval → Awaiting
Deposit → Planning → Design Direction → Awaiting Design Approval → Building → Automated
Review → QA → Awaiting Client Review → Revision → Awaiting Final Payment → Ready for
Deployment → Deploying → Live → Monitoring → Maintenance`, plus `Paused`, `Cancelled`,
`Incident` as cross-cutting states.

```
Draft ─► Discovery ─► Scope Review ─► Quote Ready ─► Awaiting Approval ─► Awaiting Deposit
                                          ▲                │ (modifications)
                                          └────────────────┘
Awaiting Deposit ─► Planning ─► Design Direction ─► Awaiting Design Approval ─► Building
Building ─► Automated Review ─► QA ─► Awaiting Client Review
   ▲            │ (fail)        │ (fail)      │
   └────────────┴───────────────┘             ├─► Revision ─► Building
                                              └─► Awaiting Final Payment
Awaiting Final Payment ─► Ready for Deployment ─► Deploying ─► Live
                                                     │ (smoke fail → rollback)
Live ─► Monitoring ⇄ Maintenance                     └─► Ready for Deployment
Monitoring/Maintenance ─► Incident ─► Monitoring   (resolution)
Any pre-Live state ─► Paused ⇄ (resume to previous state)
Governed states ─► Cancelled   (policy-gated; never silent; export workflow offered)
```

The typed transition map in code is authoritative — anything not listed there is an illegal
transition and must be rejected by the workflow engine and the API.

## Approval gates (client) and policy gates (system)

| Gate | Where | Blocks | Kind |
|---|---|---|---|
| G1 Proposal approval | Awaiting Approval → Awaiting Deposit | Everything downstream | Client |
| G2 Deposit paid | Awaiting Deposit → Planning | Workspace & build planning | Payment |
| G3 Design direction approval | Awaiting Design Approval → Building | Implementation | Client |
| G4 Staging review approval | Awaiting Client Review → Awaiting Final Payment | Launch path | Client |
| G5 Final payment | Awaiting Final Payment → Ready for Deployment | Production deployment | Payment |
| G6 Deployment approval | Ready for Deployment → Deploying | Go-live | Client |
| G7 Change-request approval | Billable change requests before execution | Provider spend | Client |
| P1 Validation green | Automated Review/QA → forward | Merge & deploy | Policy |
| P2 Deployment lock | Deploying | Concurrent deploys | Policy |
| P3 Domain actions | Domain connect/transfer | DNS changes | Policy + client confirmation for transfer |
| P4 Cancellation/data deletion | Cancelled | Destruction | Policy + confirmation + export offer |
| P5 Budget caps | Provider executions | Spend | Policy |

No agent may bypass a gate. Gate satisfaction is recorded as an `Approval` /
`AuditEvent` pair; the state machine refuses transitions with unmet gates.

## Build pipeline (within Building → QA)

Approved scope → requirements artifact → architecture decision → repository creation → branch
strategy → task decomposition → design system → content structure → implementation → automated
code review → static analysis → unit tests → integration tests → E2E tests → accessibility
tests → security checks → performance checks → SEO checks → staging deployment → client
approval → production deployment → smoke tests → monitoring activation → operations handoff.

Every task carries acceptance criteria, dependency list, assigned provider, cost budget, time
budget, retry count, validation result, artifact links, audit trail. **No provider output
reaches production without validation.**

## Change-request sizes (fair usage)

| Size | Definition | Examples |
|---|---|---|
| Small | Existing page/element change, no new structure, ≤ ~2h equivalent | Copy edit, image swap, style tweak, hours update |
| Medium | New section/page from existing patterns, minor integration config | New FAQ page, add a testimonial block, connect Clarity |
| Major revision | Redesign/restructure of an existing area | Rework the homepage layout |
| New feature | New capability | Booking, gated area, multi-language addition |
| New project scope | A different website/application | New microsite, an app (→ XApps routing check) |

Included allowances per plan are configuration (`Essential: 3 small`, `Growth: 8 small/medium`,
`Advanced: custom`). Major revisions, new features, and new scope are always quoted — approval
gate G7 applies before any billable execution.

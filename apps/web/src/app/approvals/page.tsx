import Link from 'next/link';
import { GATE_LABELS } from '@xsite/core';
import { CapabilityBadge, DemoBadge } from '@/components/badges';
import { demoProjects } from '@/lib/demo-data';

export default function ApprovalsPage() {
  const pending = demoProjects.filter((p) => p.status === 'awaiting_approval');

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Approval center</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Every decision that waits on you, across all projects. Nothing proceeds past a gate without your explicit
          approval — and approvals are recorded permanently.
        </p>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-slate-500">No pending approvals.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((p) => (
            <li key={p.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{GATE_LABELS.G1_proposal_approval}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{p.name}</p>
                </div>
                <Link
                  href={`/projects/${p.id}/quote`}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Review
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        <h2 className="mb-2 font-semibold text-slate-700 dark:text-slate-300">The approval gates</h2>
        <p className="mb-3 text-xs">
          These gates are enforced by the workflow engine — no agent can bypass them. Gate enforcement runs live in
          Phase 2 delivery orchestration <CapabilityBadge status="planned" />.
        </p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {Object.entries(GATE_LABELS).map(([key, label]) => (
            <li key={key} className="flex gap-2">
              <span className="font-mono text-xs text-slate-400">{key.split('_')[0]}</span> {label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

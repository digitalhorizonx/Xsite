import { AGENT_CATALOG } from '@xsite/core';
import { CapabilityBadge } from '@/components/badges';

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">The XSite agent team</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          XSite is operated by {AGENT_CATALOG.length} specialized AI agents with bounded permissions, audit logging,
          and explicit approval gates. They are transparent about being AI, and critical actions always require your
          confirmation. Statuses below are honest: only the pricing engine runs live in Phase 1.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {AGENT_CATALOG.map((agent) => (
          <article key={agent.key} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold">{agent.name}</h2>
              <CapabilityBadge status={agent.runtimeStatus} />
            </div>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{agent.responsibility}</p>
            <details className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              <summary className="cursor-pointer font-medium text-slate-600 dark:text-slate-300">
                Permissions &amp; governance
              </summary>
              <div className="mt-2 space-y-2">
                <div>
                  <p className="font-medium text-slate-600 dark:text-slate-300">Permission boundaries</p>
                  <ul className="mt-0.5 list-disc pl-4">
                    {agent.permissionBoundaries.map((b) => <li key={b}>{b}</li>)}
                  </ul>
                </div>
                {agent.approvalRequirements.length > 0 && (
                  <div>
                    <p className="font-medium text-slate-600 dark:text-slate-300">Requires your approval for</p>
                    <ul className="mt-0.5 list-disc pl-4">
                      {agent.approvalRequirements.map((a) => <li key={a}>{a}</li>)}
                    </ul>
                  </div>
                )}
                <p>
                  <span className="font-medium text-slate-600 dark:text-slate-300">On failure:</span>{' '}
                  {agent.failureBehavior}
                </p>
              </div>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}

import Link from 'next/link';
import { CapabilityBadge, DemoBadge, Money, ProjectStatusBadge } from '@/components/badges';
import { demoOrganization, demoProjects } from '@/lib/demo-data';

export default function DashboardPage() {
  const pending = demoProjects.filter((p) => p.pendingAction);
  const xability = demoOrganization.connections.find((c) => c.product === 'xability');

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          What is happening, what is waiting for you, and what happens next.
        </p>
      </div>

      {/* Pending actions */}
      <section aria-labelledby="pending-heading">
        <h2 id="pending-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Waiting for you
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing is waiting on you right now.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((p) => (
              <li key={p.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.pendingAction}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{p.name}</p>
                  </div>
                  <Link
                    href={`/projects/${p.id}/quote`}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    Review proposal
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Projects overview */}
      <section aria-labelledby="projects-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="projects-heading" className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Your websites
          </h2>
          <Link href="/projects/new" className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400">
            + New website request
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {demoProjects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{p.name}</p>
                <ProjectStatusBadge status={p.status} />
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {p.quote.websiteTypeLabel} · build <Money amount={p.quote.buildPrice} /> ·{' '}
                {p.quote.monthly.planLabel} <Money amount={p.quote.monthly.price} />/mo
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Ecosystem */}
      <section aria-labelledby="ecosystem-heading">
        <h2 id="ecosystem-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          HorizonX ecosystem
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {xability?.status === 'connected' ? (
              <>
                Your Xability workspace is connected — XSite reuses your approved business information, brand,
                and content instead of asking again. <CapabilityBadge status={xability.capability} />
              </>
            ) : (
              'Connect Xability to reuse your approved marketing data across HorizonX products.'
            )}
          </p>
          <Link href="/organization" className="mt-2 inline-block text-sm font-medium text-sky-600 hover:underline dark:text-sky-400">
            Manage connections →
          </Link>
        </div>
      </section>
    </div>
  );
}

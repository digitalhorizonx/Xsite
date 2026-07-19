import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GATE_LABELS, legalTransitions } from '@xsite/core';
import { CapabilityBadge, DemoBadge, Money, ProjectStatusBadge } from '@/components/badges';
import { WorkflowTimeline } from '@/components/timeline';
import { getDemoProject } from '@/lib/demo-data';

export default async function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getDemoProject(id);
  if (!project) notFound();

  const nextSteps = legalTransitions(project.status).filter((t) => t.to !== 'paused' && t.to !== 'cancelled');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <DemoBadge />
          </div>
          <div className="mt-2 flex items-center gap-3">
            <ProjectStatusBadge status={project.status} />
            <span className="text-sm text-slate-500 dark:text-slate-400">{project.quote.websiteTypeLabel}</span>
          </div>
        </div>
        <nav className="flex gap-2 text-sm" aria-label="Project sections">
          <Link href={`/projects/${project.id}/quote`} className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800">
            Quote &amp; proposal
          </Link>
          <Link href={`/projects/${project.id}/activity`} className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800">
            Activity
          </Link>
        </nav>
      </div>

      {project.pendingAction && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Waiting on you: {project.pendingAction}</p>
          <Link href={`/projects/${project.id}/quote`} className="mt-1 inline-block text-sm text-amber-800 underline dark:text-amber-300">
            Open the proposal →
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Workflow timeline
          </h2>
          <WorkflowTimeline current={project.status} />
        </section>

        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              What happens next
            </h2>
            <ul className="space-y-3">
              {nextSteps.length === 0 && (
                <li className="text-sm text-slate-500">This project is in a terminal state.</li>
              )}
              {nextSteps.map((t) => (
                <li key={t.to} className="text-sm">
                  <p className="font-medium text-slate-800 dark:text-slate-200">{t.description}</p>
                  {t.gates.length > 0 && (
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Requires: {t.gates.map((g) => GATE_LABELS[g]).join(' · ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Commercials
            </h2>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Build price</dt>
                <dd className="font-semibold"><Money amount={project.quote.buildPrice} /></dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Deposit</dt>
                <dd className="font-semibold"><Money amount={project.quote.depositAmount} /></dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Monthly plan</dt>
                <dd className="font-semibold">
                  <Money amount={project.quote.monthly.price} />/mo
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Bundle saving</dt>
                <dd className="font-semibold text-emerald-600 dark:text-emerald-400">
                  <Money amount={project.quote.monthly.bundleSaving} />/mo
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Workspace areas
            </h2>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              The full workspace (requirements, sitemap, content, design, integrations, deployments, SEO/GEO,
              analytics, security, requests, reports) activates with delivery orchestration.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {['Requirements', 'Sitemap & Pages', 'Content', 'Design', 'Build & staging', 'Integrations', 'Domains & deployments', 'SEO & GEO', 'Analytics', 'Requests', 'Reports'].map((area) => (
                <span key={area} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-slate-600 dark:border-slate-700 dark:text-slate-400">
                  {area} <CapabilityBadge status="planned" />
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

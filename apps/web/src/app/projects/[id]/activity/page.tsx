import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DemoBadge } from '@/components/badges';
import { getDemoAudit, getDemoProject } from '@/lib/demo-data';

export default async function ProjectActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getDemoProject(id);
  if (!project) notFound();

  const events = getDemoAudit(project.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${project.id}`} className="text-sm text-sky-600 hover:underline dark:text-sky-400">
          ← {project.name}
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-2xl font-bold">Activity &amp; audit history</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Every state change, approval, and agent action is recorded as an immutable audit event.
        </p>
      </div>

      <ol className="space-y-2">
        {[...events].reverse().map((e) => (
          <li key={e.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-slate-800 dark:text-slate-200">{e.action}</p>
              <time className="text-xs text-slate-400" dateTime={e.at}>{e.at.replace('T', ' ').replace('Z', ' UTC')}</time>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {e.subject} · by {e.actor.kind}:{e.actor.id}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

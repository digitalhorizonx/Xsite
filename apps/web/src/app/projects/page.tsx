import Link from 'next/link';
import { DemoBadge, Money, ProjectStatusBadge } from '@/components/badges';
import { demoProjects } from '@/lib/demo-data';

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Websites</h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Every website is a managed project with a transparent workflow.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          New website request
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Build</th>
              <th className="px-4 py-3 text-right font-medium">Monthly</th>
            </tr>
          </thead>
          <tbody>
            {demoProjects.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-4 py-3">
                  <Link href={`/projects/${p.id}`} className="font-medium text-sky-600 hover:underline dark:text-sky-400">
                    {p.name}
                  </Link>
                  <p className="text-xs text-slate-400">Created {p.createdAt}</p>
                </td>
                <td className="px-4 py-3">{p.quote.websiteTypeLabel}</td>
                <td className="px-4 py-3"><ProjectStatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-right"><Money amount={p.quote.buildPrice} /></td>
                <td className="px-4 py-3 text-right"><Money amount={p.quote.monthly.price} />/mo</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

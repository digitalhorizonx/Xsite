import { CapabilityBadge, DemoBadge } from '@/components/badges';
import { demoOrganization } from '@/lib/demo-data';

const productLabels: Record<string, { name: string; note: string }> = {
  xability: { name: 'Xability', note: 'Marketing operating system — source of approved brand, audience, campaign, and content data' },
  xsite: { name: 'XSite', note: 'Website delivery & operations (this product)' },
  xapps: { name: 'XApps', note: 'Business applications' },
  xauto: { name: 'XAuto', note: 'Automation' },
  xai: { name: 'XAI', note: 'Applied AI agents' },
};

export default function OrganizationPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Organization</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your business profile is shared across HorizonX products through XBrain — with your approval, never silently.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Business profile
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Name</dt>
            <dd className="font-medium">{demoOrganization.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Country</dt>
            <dd className="font-medium">{demoOrganization.country}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Industry</dt>
            <dd className="font-medium">{demoOrganization.industry}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Languages</dt>
            <dd className="font-medium">{demoOrganization.languages.join(', ')}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          HorizonX ecosystem connections
        </h2>
        <ul className="space-y-3">
          {demoOrganization.connections.map((c) => {
            const meta = productLabels[c.product]!;
            return (
              <li key={c.product} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 text-sm last:border-0 last:pb-0 dark:border-slate-800">
                <div>
                  <p className="font-medium">{meta.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{meta.note}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${c.status === 'connected' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {c.status === 'connected' ? 'Connected' : c.status === 'pending' ? 'Pending' : 'Not connected'}
                  </span>
                  <CapabilityBadge status={c.capability} />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          When Xability is connected, XSite reuses your approved business information, branding, content, audience
          data, and assets instead of asking again. Live synchronization ships with XBrain integration; today the
          connection model is simulated with demo data.
        </p>
      </section>
    </div>
  );
}

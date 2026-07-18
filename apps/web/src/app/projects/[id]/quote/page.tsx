import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CapabilityBadge, DemoBadge } from '@/components/badges';
import { QuoteView } from '@/components/quote-view';
import { getDemoProject } from '@/lib/demo-data';

export default async function ProjectQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getDemoProject(id);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${project.id}`} className="text-sm text-sky-600 hover:underline dark:text-sky-400">
          ← {project.name}
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-2xl font-bold">Quote &amp; proposal</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Calculated by the XBrain rules-based pricing engine — every number is itemized and explained.
        </p>
      </div>

      <QuoteView quote={project.quote} />

      {project.status === 'awaiting_approval' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-900/20">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Approval and payments are simulated in this phase <CapabilityBadge status="simulated" />
          </p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">
            In production, approving this proposal (gate G1) moves the project to Awaiting Deposit and requests the
            deposit payment. Nothing is charged in the demo.
          </p>
        </div>
      )}
    </div>
  );
}

import type { CapabilityStatus, ProjectStatus } from '@xsite/core';
import { PROJECT_STATUS_LABELS } from '@xsite/core';

/**
 * Honesty badges: every feature surface declares whether it is available,
 * simulated, planned, or requires integration. Demo data is always labeled.
 */

const capabilityStyles: Record<CapabilityStatus, string> = {
  available: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  simulated: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  planned: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  requires_integration: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
};

const capabilityLabels: Record<CapabilityStatus, string> = {
  available: 'Available',
  simulated: 'Simulated',
  planned: 'Planned',
  requires_integration: 'Requires Integration',
};

export function CapabilityBadge({ status }: { status: CapabilityStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${capabilityStyles[status]}`}
      title={`This capability is ${capabilityLabels[status].toLowerCase()} in the current phase`}
    >
      {capabilityLabels[status]}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
      Demo
    </span>
  );
}

const statusTone = (s: ProjectStatus): string => {
  if (s === 'live' || s === 'monitoring') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
  if (s === 'incident') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
  if (s === 'paused' || s === 'cancelled') return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  if (s.startsWith('awaiting')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300';
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTone(status)}`}>
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}

export function Money({ amount, currency = 'USD' }: { amount: number; currency?: string }) {
  return (
    <span className="tabular-nums">
      {new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)}
    </span>
  );
}

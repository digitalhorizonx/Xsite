import type { ProjectStatus } from '@xsite/core';
import { HAPPY_PATH, PROJECT_STATUS_LABELS } from '@xsite/core';

/**
 * Workflow timeline — rendered directly from the @xsite/core state machine's
 * canonical happy path, so the portal can never drift from the real workflow.
 */
export function WorkflowTimeline({ current }: { current: ProjectStatus }) {
  const currentIdx = HAPPY_PATH.indexOf(current);
  return (
    <ol className="space-y-0" aria-label="Project workflow timeline">
      {HAPPY_PATH.map((status, i) => {
        const done = currentIdx > i || current === 'monitoring';
        const active = currentIdx === i;
        return (
          <li key={status} className="relative flex gap-3 pb-4 last:pb-0">
            {i < HAPPY_PATH.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-[7px] top-5 h-full w-0.5 ${done ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`}
              />
            )}
            <span
              aria-hidden
              className={`relative mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                done
                  ? 'border-emerald-400 bg-emerald-400'
                  : active
                    ? 'border-sky-500 bg-white dark:bg-slate-900'
                    : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'
              }`}
            />
            <div>
              <p className={`text-sm ${active ? 'font-semibold text-sky-700 dark:text-sky-300' : done ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                {PROJECT_STATUS_LABELS[status]}
                {active && <span className="ml-2 text-xs font-normal">← current stage</span>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

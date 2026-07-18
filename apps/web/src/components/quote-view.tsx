import type { ClientQuote } from '@xsite/core';
import { Money } from './badges';

/**
 * Transparent quote presentation. Renders ONLY the client-facing ClientQuote —
 * the internal breakdown never reaches this component (or any client API).
 */
export function QuoteView({ quote }: { quote: ClientQuote }) {
  return (
    <div className="space-y-6">
      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Build price" value={<Money amount={quote.buildPrice} currency={quote.currency} />} />
        <Stat
          label={`Deposit (${Math.round(quote.depositPct * 100)}%)`}
          value={<Money amount={quote.depositAmount} currency={quote.currency} />}
          hint="Due after proposal approval"
        />
        <Stat
          label="Remaining"
          value={<Money amount={quote.remainingAmount} currency={quote.currency} />}
          hint="Due before production launch"
        />
        <Stat
          label="Monthly plan"
          value={
            <>
              {quote.monthly.startingAt && <span className="text-sm font-normal">from </span>}
              <Money amount={quote.monthly.price} currency={quote.currency} />
              <span className="text-sm font-normal">/mo</span>
            </>
          }
          hint={`${quote.monthly.planLabel} · starts at go-live`}
        />
      </div>

      {quote.monthly.bundleSaving > 0 && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
          Xability bundle applied — you save <Money amount={quote.monthly.bundleSaving} currency={quote.currency} />
          /month compared to the standalone price of{' '}
          <Money amount={quote.monthly.standalonePrice} currency={quote.currency} />.
        </p>
      )}

      {quote.requiresCustomPricing && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          This project is at custom-quote scale. The figures shown are a guiding estimate pending a tailored proposal.
        </p>
      )}

      {/* Line items */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">How this price was calculated</h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <tbody>
              {quote.lineItems.map((li) => (
                <tr key={li.key} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{li.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{li.reason}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right align-top font-medium text-slate-800 dark:text-slate-200">
                    {li.amount < 0 ? '−' : ''}
                    <Money amount={Math.abs(li.amount)} currency={quote.currency} />
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">Total build price</td>
                <td className="px-4 py-2.5 text-right font-semibold text-slate-900 dark:text-white">
                  <Money amount={quote.buildPrice} currency={quote.currency} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ListCard title="Included in scope" items={quote.includedScope} tone="ok" />
        <ListCard title="Not included" items={quote.excludedScope} tone="muted" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ListCard title="Assumptions" items={quote.assumptions} tone="muted" />
        <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Third-party costs (paid directly)</h3>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            {quote.thirdPartyCosts.map((c) => (
              <li key={c.label}>
                <span className="font-medium text-slate-800 dark:text-slate-200">{c.label}</span> — {c.estimate}.{' '}
                {c.note}
              </li>
            ))}
          </ul>
          <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
            <dt className="text-slate-500 dark:text-slate-400">Delivery estimate</dt>
            <dd className="text-right text-slate-800 dark:text-slate-200">
              {quote.deliveryEstimateWeeks.min}–{quote.deliveryEstimateWeeks.max} weeks
            </dd>
            <dt className="text-slate-500 dark:text-slate-400">Risk level</dt>
            <dd className="text-right capitalize text-slate-800 dark:text-slate-200">{quote.riskLevel}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Quote valid for</dt>
            <dd className="text-right text-slate-800 dark:text-slate-200">{quote.quoteValidityDays} days</dd>
            <dt className="text-slate-500 dark:text-slate-400">Minimum acceptable price</dt>
            <dd className="text-right text-slate-800 dark:text-slate-200">
              <Money amount={quote.minimumBuildPrice} currency={quote.currency} />
            </dd>
          </dl>
        </section>
      </div>

      <section className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
        <h3 className="mb-2 font-semibold text-slate-700 dark:text-slate-300">Explanation</h3>
        <ul className="list-disc space-y-1 pl-5">
          {quote.explanation.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

function ListCard({ title, items, tone }: { title: string; items: string[]; tone: 'ok' | 'muted' }) {
  return (
    <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
      <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className={tone === 'ok' ? 'text-emerald-500' : 'text-slate-400'}>
              {tone === 'ok' ? '✓' : '·'}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CapabilityBadge } from '@/components/badges';

/**
 * Mock checkout confirmation screen — the sandbox stand-in for a real
 * hosted payment page. This page's buttons are the ONLY thing that can
 * produce a mock payment outcome, and even they don't set the payment
 * status directly: clicking one POSTs to the real webhook endpoint
 * (/api/webhooks/payments/mock), which is the same authoritative code path
 * a real provider's server-to-server callback would use. There is no
 * client-side "mark as paid" — this page proves the browser-return-is-
 * never-authoritative rule even in the sandbox provider.
 */
export default function MockPayPage() {
  return (
    <Suspense fallback={null}>
      <MockPayScreen />
    </Suspense>
  );
}

function MockPayScreen() {
  const params = useSearchParams();
  const paymentId = params.get('paymentId') ?? '';
  const amount = params.get('amount') ?? '0';
  const currency = params.get('currency') ?? 'USD';
  const [result, setResult] = useState<'succeeded' | 'failed' | null>(null);
  const [loading, setLoading] = useState(false);

  async function simulate(outcome: 'succeeded' | 'failed') {
    setLoading(true);
    try {
      await fetch('/api/webhooks/payments/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: crypto.randomUUID(),
          eventType: 'mock.confirmed',
          paymentId,
          outcome,
        }),
      });
      setResult(outcome);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 p-10">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">Mock payment</h1>
        <CapabilityBadge status="simulated" />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        This stands in for a real hosted payment page in Phase 1.5. Amount: {currency} {amount} · Payment {paymentId}
      </p>

      {result === null ? (
        <div className="flex gap-3">
          <button
            disabled={loading}
            onClick={() => simulate('succeeded')}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Simulate successful payment
          </button>
          <button
            disabled={loading}
            onClick={() => simulate('failed')}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Simulate failed payment
          </button>
        </div>
      ) : (
        <p className={`text-sm font-medium ${result === 'succeeded' ? 'text-emerald-600' : 'text-red-600'}`}>
          Webhook sent — outcome: {result}. Refresh the project page to see the updated payment status.
        </p>
      )}
    </div>
  );
}

'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SalesLoginPage() {
  const router = useRouter(); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(''); const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ password }) }); setBusy(false); if (!response.ok) { const data = await response.json().catch(() => ({})); setError(data.error || 'Login failed'); return; } router.replace('/sales'); router.refresh(); }
  return <div className="mx-auto max-w-md py-20"><div className="card"><p className="text-xs font-bold uppercase tracking-[.18em] text-orange-500">Internal access</p><h1 className="mt-2 text-3xl font-black">Sales Command Center</h1><p className="mt-2 text-sm text-slate-500">Protected HorizonX workspace. Client intake remains public; sales and financial data do not.</p><form onSubmit={submit} className="mt-7 space-y-4"><input type="password" autoComplete="current-password" required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Admin password" className="input" />{error && <p className="text-sm font-semibold text-red-600">{error}</p>}<button disabled={busy} className="w-full rounded-xl bg-orange-500 px-5 py-3 font-black text-black disabled:opacity-50">{busy ? 'Checking…' : 'Sign in securely'}</button></form></div></div>;
}

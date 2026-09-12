import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { DemoBadge } from '@/components/badges';
import { demoOrganization } from '@/lib/demo-data';

export const metadata: Metadata = {
  title: 'XSite — AI-managed website delivery and operations',
  description: 'XSite by HorizonX: from business brief to a live, managed, measurable website.',
};

const nav: Array<{ href: string; label: string }> = [
  { href: '/', label: 'Dashboard' },
  { href: '/sales', label: 'Sales & Cashflow' },
  { href: '/start-project', label: 'Project Intake' },
  { href: '/projects', label: 'Websites' },
  { href: '/approvals', label: 'Approval center' },
  { href: '/agents', label: 'Agents' },
  { href: '/organization', label: 'Organization' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <aside className="hidden w-60 shrink-0 border-e border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex md:flex-col">
            <Link href="/" className="mb-1 flex items-baseline gap-1 px-2">
              <span className="text-xl font-bold tracking-tight">XSite</span>
              <span className="text-xs text-slate-400">by HorizonX</span>
            </Link>
            <p className="mb-6 px-2 text-xs text-slate-500 dark:text-slate-400">AI-managed digital delivery &amp; revenue operations</p>
            <nav aria-label="Main navigation" className="flex flex-col gap-1">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">{item.label}</Link>
              ))}
            </nav>
            <div className="mt-auto space-y-2 px-2 pt-6">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{demoOrganization.name}</p>
              <p className="text-xs text-slate-400">Phase 1 foundation — legacy portal data is demo. <DemoBadge /></p>
            </div>
          </aside>
          <div className="min-w-0 flex-1">
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900 md:hidden">
              <Link href="/" className="text-lg font-bold">XSite</Link>
              <Link href="/sales" className="text-sm font-semibold text-orange-500">Sales</Link>
            </header>
            <main className="mx-auto max-w-6xl p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

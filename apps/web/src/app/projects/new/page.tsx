'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  recommendWebsiteType,
  WEBSITE_TYPE_LABELS,
  type BuildScope,
  type ClientQuote,
  type DiscoveryAnswers,
  type RoutingAssessment,
  type WebsiteType,
} from '@xsite/core';
import { CapabilityBadge, DemoBadge } from '@/components/badges';
import { QuoteView } from '@/components/quote-view';

/**
 * Guided discovery wizard — Phase 1.
 *
 * Steps: business basics → website needs → quality & speed → live quote →
 * proposal approval (SIMULATED payment boundary, clearly labeled).
 * The quote is calculated by the real pricing engine through the typed
 * /api/v1/quotes/calculate boundary.
 */

type Step = 'basics' | 'features' | 'quality' | 'quote' | 'approved';

const defaultAnswers: DiscoveryAnswers = {
  primaryGoal: 'present_business',
  industry: '',
  pageEstimate: 5,
  needsOnlinePayment: false,
  productCount: 0,
  needsBooking: false,
  needsMemberArea: false,
  contentPublishingFrequency: 'occasional',
  singleOffer: false,
};

interface FeatureFlags {
  cms: boolean;
  blog: boolean;
  copywritingRequired: boolean;
  brandIdentityAvailable: boolean;
  languageCount: number;
  crmIntegration: boolean;
  emailMarketing: boolean;
  whatsapp: boolean;
  maps: boolean;
  tracking: boolean;
  contentMigration: boolean;
  domainMigration: boolean;
}

const defaultFeatures: FeatureFlags = {
  cms: true,
  blog: false,
  copywritingRequired: false,
  brandIdentityAvailable: true,
  languageCount: 1,
  crmIntegration: false,
  emailMarketing: false,
  whatsapp: false,
  maps: false,
  tracking: true,
  contentMigration: false,
  domainMigration: false,
};

interface QualityChoices {
  customUiLevel: BuildScope['customUiLevel'];
  accessibilityLevel: BuildScope['accessibilityLevel'];
  deliverySpeed: BuildScope['deliverySpeed'];
}

const defaultQuality: QualityChoices = {
  customUiLevel: 'standard',
  accessibilityLevel: 'standard',
  deliverySpeed: 'standard',
};

function buildScope(a: DiscoveryAnswers, f: FeatureFlags, q: QualityChoices, type: WebsiteType): BuildScope {
  const ecommerce = type === 'ecommerce';
  return {
    websiteType: type,
    pageCount: Math.max(1, a.pageEstimate),
    languageCount: f.languageCount,
    customUiLevel: q.customUiLevel,
    copywritingRequired: f.copywritingRequired,
    brandIdentityAvailable: f.brandIdentityAvailable,
    cms: f.cms,
    blog: f.blog,
    ecommerce,
    productCount: ecommerce ? Math.max(1, a.productCount) : 0,
    booking: a.needsBooking || type === 'booking',
    paymentGateway: a.needsOnlinePayment,
    authentication: a.needsMemberArea || type === 'membership',
    userRoles: false,
    dashboard: false,
    externalApiCount: 0,
    crmIntegration: f.crmIntegration,
    erpIntegration: false,
    xabilityIntegration: true,
    metaPixel: f.tracking,
    googleAnalytics: f.tracking,
    googleTagManager: f.tracking,
    searchConsole: f.tracking,
    googleBusinessProfile: f.tracking,
    emailMarketing: f.emailMarketing,
    whatsapp: f.whatsapp,
    maps: f.maps,
    seoMigration: f.domainMigration,
    contentMigration: f.contentMigration,
    domainMigration: f.domainMigration,
    accessibilityLevel: q.accessibilityLevel,
    performanceTarget: 'standard',
    securityRequirement: a.needsOnlinePayment ? 'elevated' : 'standard',
    deliverySpeed: q.deliverySpeed,
    // Internal estimates are derived server-side in later phases; the demo
    // wizard sends conservative defaults (they never appear in the quote).
    estimatedAiExecutionCost: 80,
    estimatedInfraCost: 25,
    riskLevel: ecommerce ? 'medium' : 'low',
    qaComplexity: ecommerce ? 'complex' : 'standard',
  };
}

export default function NewProjectPage() {
  const [step, setStep] = useState<Step>('basics');
  const [answers, setAnswers] = useState<DiscoveryAnswers>(defaultAnswers);
  const [features, setFeatures] = useState<FeatureFlags>(defaultFeatures);
  const [quality, setQuality] = useState<QualityChoices>(defaultQuality);
  const [quote, setQuote] = useState<ClientQuote | null>(null);
  const [routing, setRouting] = useState<RoutingAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recommendedType = recommendWebsiteType(answers);

  async function requestQuote() {
    setLoading(true);
    setError(null);
    try {
      const scope = buildScope(answers, features, quality, recommendedType);
      const res = await fetch('/api/v1/quotes/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, xabilityBundleEligible: true }),
      });
      if (!res.ok) throw new Error(`Quote calculation failed (${res.status})`);
      const data = (await res.json()) as { quote: ClientQuote; routing: RoutingAssessment };
      setQuote(data.quote);
      setRouting(data.routing);
      setStep('quote');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  const steps: Step[] = ['basics', 'features', 'quality', 'quote'];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">New website request</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Guided discovery — XBrain proposes the website type and calculates a transparent quote from your answers.
        </p>
      </div>

      {/* Stepper */}
      {step !== 'approved' && (
        <ol className="flex gap-2 text-xs" aria-label="Discovery steps">
          {steps.map((s, i) => (
            <li
              key={s}
              className={`rounded-full px-3 py-1 ${
                step === s
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : steps.indexOf(step) > i
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {i + 1}. {s === 'basics' ? 'Business' : s === 'features' ? 'Needs' : s === 'quality' ? 'Quality' : 'Quote'}
            </li>
          ))}
        </ol>
      )}

      {step === 'basics' && (
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <Field label="What should this website achieve?">
            <select
              className="input"
              value={answers.primaryGoal}
              onChange={(e) => setAnswers({ ...answers, primaryGoal: e.target.value as DiscoveryAnswers['primaryGoal'] })}
            >
              <option value="present_business">Present my business</option>
              <option value="generate_leads">Generate leads</option>
              <option value="sell_products">Sell products</option>
              <option value="take_bookings">Take bookings</option>
              <option value="publish_content">Publish content</option>
              <option value="showcase_work">Showcase my work</option>
              <option value="run_membership">Run a membership</option>
              <option value="custom_application">Something custom</option>
            </select>
          </Field>
          <Field label="Your industry">
            <input
              className="input"
              placeholder="e.g. consulting, restaurant, clinic, real estate"
              value={answers.industry}
              onChange={(e) => setAnswers({ ...answers, industry: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Roughly how many pages?">
              <input
                className="input"
                type="number"
                min={1}
                max={100}
                value={answers.pageEstimate}
                onChange={(e) => setAnswers({ ...answers, pageEstimate: Number(e.target.value) })}
              />
            </Field>
            <Field label="How often will you publish content?">
              <select
                className="input"
                value={answers.contentPublishingFrequency}
                onChange={(e) =>
                  setAnswers({ ...answers, contentPublishingFrequency: e.target.value as DiscoveryAnswers['contentPublishingFrequency'] })
                }
              >
                <option value="none">Rarely or never</option>
                <option value="occasional">Occasionally</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <Check label="One single offer / campaign" checked={answers.singleOffer} onChange={(v) => setAnswers({ ...answers, singleOffer: v })} />
            <Check label="Take payments online" checked={answers.needsOnlinePayment} onChange={(v) => setAnswers({ ...answers, needsOnlinePayment: v })} />
            <Check label="Bookings / appointments" checked={answers.needsBooking} onChange={(v) => setAnswers({ ...answers, needsBooking: v })} />
            <Check label="Members-only area" checked={answers.needsMemberArea} onChange={(v) => setAnswers({ ...answers, needsMemberArea: v })} />
          </div>
          {answers.primaryGoal === 'sell_products' && (
            <Field label="How many products?">
              <input
                className="input"
                type="number"
                min={1}
                value={answers.productCount}
                onChange={(e) => setAnswers({ ...answers, productCount: Number(e.target.value) })}
              />
            </Field>
          )}
          <div className="rounded-md bg-sky-50 p-3 text-sm text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
            XBrain recommendation so far: <strong>{WEBSITE_TYPE_LABELS[recommendedType]}</strong>
          </div>
          <NavButtons onNext={() => setStep('features')} />
        </section>
      )}

      {step === 'features' && (
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap gap-4">
            <Check label="Editable content (CMS)" checked={features.cms} onChange={(v) => setFeatures({ ...features, cms: v })} />
            <Check label="Blog" checked={features.blog} onChange={(v) => setFeatures({ ...features, blog: v })} />
            <Check label="Write the copy for me" checked={features.copywritingRequired} onChange={(v) => setFeatures({ ...features, copywritingRequired: v })} />
            <Check label="I already have a brand identity" checked={features.brandIdentityAvailable} onChange={(v) => setFeatures({ ...features, brandIdentityAvailable: v })} />
            <Check label="CRM integration" checked={features.crmIntegration} onChange={(v) => setFeatures({ ...features, crmIntegration: v })} />
            <Check label="Email marketing" checked={features.emailMarketing} onChange={(v) => setFeatures({ ...features, emailMarketing: v })} />
            <Check label="WhatsApp" checked={features.whatsapp} onChange={(v) => setFeatures({ ...features, whatsapp: v })} />
            <Check label="Maps / location" checked={features.maps} onChange={(v) => setFeatures({ ...features, maps: v })} />
            <Check label="Analytics & tracking setup" checked={features.tracking} onChange={(v) => setFeatures({ ...features, tracking: v })} />
            <Check label="Migrate existing content" checked={features.contentMigration} onChange={(v) => setFeatures({ ...features, contentMigration: v })} />
            <Check label="Migrate my existing domain" checked={features.domainMigration} onChange={(v) => setFeatures({ ...features, domainMigration: v })} />
          </div>
          <Field label="Languages">
            <select
              className="input"
              value={features.languageCount}
              onChange={(e) => setFeatures({ ...features, languageCount: Number(e.target.value) })}
            >
              <option value={1}>One language</option>
              <option value={2}>Two languages (e.g. Arabic + English)</option>
              <option value={3}>Three languages</option>
            </select>
          </Field>
          <NavButtons onBack={() => setStep('basics')} onNext={() => setStep('quality')} />
        </section>
      )}

      {step === 'quality' && (
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <Field label="Design level">
            <select
              className="input"
              value={quality.customUiLevel}
              onChange={(e) => setQuality({ ...quality, customUiLevel: e.target.value as QualityChoices['customUiLevel'] })}
            >
              <option value="standard">Standard — polished, proven layouts</option>
              <option value="custom">Custom — tailored design language</option>
              <option value="premium">Premium — fully bespoke design</option>
            </select>
          </Field>
          <Field label="Accessibility">
            <select
              className="input"
              value={quality.accessibilityLevel}
              onChange={(e) => setQuality({ ...quality, accessibilityLevel: e.target.value as QualityChoices['accessibilityLevel'] })}
            >
              <option value="standard">Standard good practice</option>
              <option value="enhanced">Enhanced</option>
              <option value="wcag_aa">WCAG AA conformance</option>
            </select>
          </Field>
          <Field label="Delivery speed">
            <select
              className="input"
              value={quality.deliverySpeed}
              onChange={(e) => setQuality({ ...quality, deliverySpeed: e.target.value as QualityChoices['deliverySpeed'] })}
            >
              <option value="standard">Standard schedule</option>
              <option value="expedited">Expedited (+15%)</option>
              <option value="rush">Rush (+30%)</option>
            </select>
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <NavButtons
            onBack={() => setStep('features')}
            onNext={requestQuote}
            nextLabel={loading ? 'Calculating…' : 'Calculate my quote'}
            nextDisabled={loading}
          />
        </section>
      )}

      {step === 'quote' && quote && (
        <section className="space-y-6">
          {routing?.route === 'xapps_candidate' && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-900/20 dark:text-sky-200">
              <p className="font-semibold">This looks like more than a website.</p>
              <p className="mt-1">
                Some of what you described ({routing.reasons.join('; ').toLowerCase()}) fits a business application.
                When XApps activates, that part can be delivered there — XSite will still build and manage your public
                website. <CapabilityBadge status="planned" />
              </p>
            </div>
          )}
          <QuoteView quote={quote} />
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-900/20">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              Approval &amp; deposit are simulated in this phase <CapabilityBadge status="simulated" />
            </p>
            <p className="mt-1 text-amber-800 dark:text-amber-300">
              In production, approving sends the proposal to the payment step ({Math.round(quote.depositPct * 100)}%
              deposit of {quote.currency} {quote.depositAmount}). No real payment happens here.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep('approved')}
              className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Approve proposal (simulated)
            </button>
            <button
              onClick={() => setStep('basics')}
              className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Request modifications
            </button>
          </div>
        </section>
      )}

      {step === 'approved' && quote && (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-900/20">
          <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-200">Proposal approved (simulated)</h2>
          <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
            In production this would move the project to <strong>Awaiting Deposit</strong> (gate G1 satisfied), collect
            the {quote.currency} {quote.depositAmount} deposit, then create your project workspace and start planning.
            Delivery orchestration ships in Phase 2 <CapabilityBadge status="planned" />.
          </p>
          <Link href="/projects" className="mt-4 inline-block text-sm font-medium text-emerald-900 underline dark:text-emerald-200">
            Back to websites
          </Link>
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      {label}
    </label>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex gap-3 pt-2">
      {onBack && (
        <button
          onClick={onBack}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Back
        </button>
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        {nextLabel}
      </button>
    </div>
  );
}

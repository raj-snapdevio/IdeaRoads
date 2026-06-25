import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { CtaButton } from "@/components/marketing/cta-button";

type Benefit = { heading: string; body: string };

export function FeatureDetail({
  eyebrow,
  titleLead,
  titleHighlight,
  subtitle,
  benefits,
  listTitle,
  features,
  mockup,
  ctaHeading,
  ctaSubtitle,
}: {
  eyebrow: string;
  titleLead: string;
  titleHighlight: string;
  subtitle: string;
  benefits: Benefit[];
  listTitle: string;
  features: string[];
  mockup: ReactNode;
  ctaHeading: string;
  ctaSubtitle: string;
}) {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-canvas">
        <div aria-hidden="true" className="mk-aura absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50/70 px-3 py-1 text-xs font-semibold text-brand-700">
            {eyebrow}
          </span>
          <h1 className="mk-display mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] text-ink sm:text-6xl">
            {titleLead}{" "}
            <span className="mk-gradient-text">{titleHighlight}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-soft">
            {subtitle}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <CtaButton href="/login">Start free</CtaButton>
            <CtaButton href="/demo" variant="secondary">
              View demo
            </CtaButton>
          </div>
        </div>
      </section>

      {/* Benefit pillars */}
      <section className="bg-canvas-2">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="grid gap-6 lg:grid-cols-3">
            {benefits.map(({ heading, body }, i) => (
              <div
                className="rounded-mk-xl border border-hairline bg-surface p-7 shadow-mk-sm"
                key={heading}
              >
                <span className="mk-display flex size-9 items-center justify-center rounded-mk bg-brand-50 text-sm font-bold text-brand-600">
                  {i + 1}
                </span>
                <h3 className="mk-display mt-4 text-lg font-bold text-ink">
                  {heading}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-1">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mockup + feature list */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="grid items-start gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            {mockup}
            <div>
              <span className="inline-flex items-center rounded-full border border-hairline bg-canvas-2 px-3 py-1 text-xs font-semibold text-slate-1">
                What&apos;s included
              </span>
              <h2 className="mk-display mt-5 text-2xl font-bold text-ink sm:text-3xl">
                {listTitle}
              </h2>
              <ul className="mt-7 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {features.map((item) => (
                  <li
                    className="flex items-start gap-2.5 text-sm text-ink"
                    key={item}
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <Check aria-hidden="true" className="size-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-canvas-2">
        <div className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
          <div className="mk-cta-panel relative overflow-hidden rounded-mk-2xl px-6 py-16 text-center shadow-mk-xl sm:px-12 sm:py-20">
            <div
              aria-hidden="true"
              className="mk-dotgrid absolute inset-0 opacity-30 mask-[radial-gradient(70%_70%_at_50%_50%,black,transparent)]"
            />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="mk-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">
                {ctaHeading}
              </h2>
              <p className="mt-4 text-lg text-white/80">{ctaSubtitle}</p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <CtaButton href="/login" variant="light">
                  Start free
                </CtaButton>
                <CtaButton
                  className="border border-white/25 bg-white/10 text-white shadow-none hover:bg-white/15"
                  href="/features"
                  variant="ghost"
                >
                  See all features
                </CtaButton>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

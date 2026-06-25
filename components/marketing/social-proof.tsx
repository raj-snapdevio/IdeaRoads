import { Quote } from "lucide-react";

const STATS = [
  { value: "2,000+", label: "Teams collecting feedback" },
  { value: "1.4M", label: "Votes cast by end users" },
  { value: "98%", label: "Voters notified on ship" },
  { value: "<5 min", label: "From clone to live board" },
] as const;

export function SocialProof() {
  return (
    <section className="bg-canvas-2">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        {/* Stat band */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-mk-xl border border-hairline bg-hairline lg:grid-cols-4">
          {STATS.map(({ value, label }) => (
            <div className="bg-surface px-6 py-8 text-center" key={label}>
              <p className="mk-display text-3xl font-extrabold text-ink sm:text-4xl">
                {value}
              </p>
              <p className="mt-2 text-sm text-slate-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Testimonial */}
        <figure className="mk-card-glow mx-auto mt-8 max-w-3xl rounded-mk-xl border border-hairline px-7 py-10 text-center shadow-mk sm:px-12">
          <Quote aria-hidden="true" className="mx-auto size-8 text-brand-300" />
          <blockquote className="mk-display mt-5 text-xl font-semibold leading-9 text-ink sm:text-2xl">
            “We replaced a spreadsheet, a Notion doc, and a $400/mo tool with
            IdeaRoads. Our users finally feel heard — and they get an email the
            day their request ships.”
          </blockquote>
          <figcaption className="mt-7 flex items-center justify-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-linear-to-br from-brand-500 to-grape-500 text-sm font-bold text-white">
              MR
            </span>
            <div className="text-left">
              <p className="text-sm font-semibold text-ink">Maya Rodriguez</p>
              <p className="text-xs text-slate-1">Head of Product, Northwind</p>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

import { ArrowRight, Sparkles, Star } from "lucide-react";
import { CtaButton } from "@/components/marketing/cta-button";
import { HeroMockup } from "@/components/marketing/hero-mockup";
import { GITHUB_REPO_URL } from "@/config/platform";

const AVATARS = [
  { initials: "AM", tint: "from-brand-500 to-grape-500" },
  { initials: "RK", tint: "from-grape-500 to-brand-600" },
  { initials: "JD", tint: "from-sun-400 to-brand-500" },
  { initials: "SL", tint: "from-mint-400 to-brand-500" },
] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-canvas">
      {/* Ambient background */}
      <div aria-hidden="true" className="mk-aura absolute inset-0" />
      <div
        aria-hidden="true"
        className="mk-grid absolute inset-0 mask-[radial-gradient(70%_55%_at_50%_0%,black,transparent)]"
      />

      <div className="relative mx-auto max-w-7xl px-5 pt-16 pb-20 sm:px-8 sm:pt-24 lg:pb-28">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
          {/* Copy */}
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/70 px-3 py-1.5 text-xs font-semibold text-brand-700">
              <Sparkles aria-hidden="true" className="size-3.5" />
              Open source · MIT licensed · Self-hostable
            </span>

            <h1 className="mk-display mt-6 text-[2.75rem] font-extrabold leading-[1.05] text-ink sm:text-6xl">
              Ship what your
              <br className="hidden sm:block" /> users{" "}
              <span className="mk-gradient-text">actually want.</span>
            </h1>

            <p className="mt-6 text-lg leading-8 text-ink-soft">
              Collect feedback, let users vote on priorities, publish a public
              roadmap, and automatically notify every voter the moment you ship.
              One platform that closes the loop.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <CtaButton href="/login">
                Start free
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-150 group-hover/cta:translate-x-0.5"
                />
              </CtaButton>
              <CtaButton external href={GITHUB_REPO_URL} variant="secondary">
                <Star aria-hidden="true" className="size-4" />
                View on GitHub
              </CtaButton>
            </div>

            {/* Social proof */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2.5">
                  {AVATARS.map(({ initials, tint }) => (
                    <span
                      className={`flex size-9 items-center justify-center rounded-full bg-linear-to-br ring-2 ring-canvas ${tint} text-[0.65rem] font-bold text-white`}
                      key={initials}
                    >
                      {initials}
                    </span>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    2,000+ product teams
                  </p>
                  <p className="text-xs text-slate-1">collect feedback here</p>
                </div>
              </div>

              <div className="h-9 w-px bg-hairline" />

              <div>
                <div className="flex items-center gap-0.5 text-sun-400">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star
                      aria-hidden="true"
                      className="size-4 fill-current"
                      key={i}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-1">
                  Loved by makers & teams
                </p>
              </div>
            </div>
          </div>

          {/* Product visual */}
          <div className="relative lg:pl-6">
            <HeroMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

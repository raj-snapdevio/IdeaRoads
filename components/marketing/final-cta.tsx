import { ArrowRight, Star } from "lucide-react";
import { CtaButton } from "@/components/marketing/cta-button";
import { GITHUB_REPO_URL } from "@/config/platform";

export function FinalCta() {
  return (
    <section className="bg-canvas-2">
      <div className="mx-auto max-w-7xl px-5 pb-24 pt-4 sm:px-8">
        <div className="mk-cta-panel relative overflow-hidden rounded-mk-2xl px-6 py-16 text-center shadow-mk-xl sm:px-12 sm:py-20">
          <div
            aria-hidden="true"
            className="mk-dotgrid absolute inset-0 opacity-30 mask-[radial-gradient(70%_70%_at_50%_50%,black,transparent)]"
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="mk-display text-3xl font-extrabold leading-tight text-white sm:text-5xl">
              Ready to ship what your users actually want?
            </h2>
            <p className="mt-5 text-lg text-white/80">
              Set up your first board in under five minutes. No credit card
              required — and voters never pay a seat fee.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <CtaButton href="/login" variant="light">
                Start free
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-150 group-hover/cta:translate-x-0.5"
                />
              </CtaButton>
              <CtaButton
                className="border border-white/25 bg-white/10 text-white shadow-none hover:bg-white/15"
                external
                href={GITHUB_REPO_URL}
                variant="ghost"
              >
                <Star aria-hidden="true" className="size-4" />
                View on GitHub
              </CtaButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

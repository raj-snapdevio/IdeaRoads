import { ArrowDown, Check, X } from "lucide-react";

const PROBLEMS = [
  {
    before: "Feature requests buried in email, Notion, and Slack",
    after:
      "One board. Every request in one place, ranked by the users who care most.",
  },
  {
    before: "Roadmap decisions based on whoever complained loudest",
    after:
      "Vote counts give you real signal. Build what's actually blocking users.",
  },
  {
    before: "Shipping features users asked for — without them ever finding out",
    after: "Every voter gets an email the day their requested feature ships.",
  },
] as const;

export function ProblemFraming() {
  return (
    <section className="bg-canvas">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-hairline bg-canvas-2 px-3 py-1 text-xs font-semibold text-slate-1">
            Sound familiar?
          </span>
          <h2 className="mk-display mt-5 text-3xl font-bold text-ink sm:text-4xl">
            Feedback is everywhere.
            <br className="hidden sm:block" /> Structure is nowhere.
          </h2>
          <p className="mt-4 text-lg leading-8 text-ink-soft">
            Most product teams collect feedback in five different places, make
            roadmap decisions by instinct, and ship features into silence.
            IdeaRoads fixes all three.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PROBLEMS.map(({ before, after }) => (
            <div
              className="flex flex-col rounded-mk-xl border border-hairline bg-surface p-6 shadow-mk-sm transition-all duration-150 hover:-translate-y-1 hover:shadow-mk"
              key={before}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-canvas-2 text-slate-2">
                  <X aria-hidden="true" className="size-3.5" />
                </span>
                <p className="text-sm leading-6 text-slate-1 line-through decoration-hairline-strong decoration-1">
                  {before}
                </p>
              </div>

              <div className="my-4 flex justify-center">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                  <ArrowDown aria-hidden="true" className="size-4" />
                </span>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
                  <Check aria-hidden="true" className="size-3.5" />
                </span>
                <p className="text-sm font-semibold leading-6 text-ink">
                  {after}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { Check, Minus } from "lucide-react";
import { CtaButton } from "@/components/marketing/cta-button";
import { Logo } from "@/components/marketing/logo";

type Cell = { text: string; ok: boolean };

const ROWS: {
  feature: string;
  ir: string;
  canny: Cell;
  upvoty: Cell;
}[] = [
  {
    feature: "Voter pricing",
    ir: "Free for everyone",
    canny: { text: "Paid per voter", ok: false },
    upvoty: { text: "Paid per seat", ok: false },
  },
  {
    feature: "Data ownership",
    ir: "Your server",
    canny: { text: "Canny's cloud", ok: false },
    upvoty: { text: "Upvoty's cloud", ok: false },
  },
  {
    feature: "Notify voters on ship",
    ir: "Automatic",
    canny: { text: "Manual only", ok: false },
    upvoty: { text: "Manual only", ok: false },
  },
  {
    feature: "Public roadmap",
    ir: "Included",
    canny: { text: "Paid add-on", ok: false },
    upvoty: { text: "Included", ok: true },
  },
  {
    feature: "Changelog",
    ir: "Included",
    canny: { text: "Paid plan only", ok: false },
    upvoty: { text: "Included", ok: true },
  },
  {
    feature: "Self-hosted option",
    ir: "Yes",
    canny: { text: "No", ok: false },
    upvoty: { text: "No", ok: false },
  },
  {
    feature: "Open source",
    ir: "MIT licensed",
    canny: { text: "Proprietary", ok: false },
    upvoty: { text: "Proprietary", ok: false },
  },
];

function CompetitorCell({ cell }: { cell: Cell }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-1">
      {cell.ok ? (
        <Check aria-hidden="true" className="size-4 text-slate-2" />
      ) : (
        <Minus aria-hidden="true" className="size-4 text-slate-2" />
      )}
      {cell.text}
    </span>
  );
}

export function Comparison() {
  return (
    <section className="bg-canvas">
      <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-hairline bg-canvas-2 px-3 py-1 text-xs font-semibold text-slate-1">
            Why teams switch
          </span>
          <h2 className="mk-display mt-5 text-3xl font-bold text-ink sm:text-4xl">
            Built differently from day one.
          </h2>
          <p className="mt-4 text-lg leading-8 text-ink-soft">
            Canny charges per voter. IdeaRoads doesn't. That's just the start.
          </p>
        </div>

        {/* Desktop table */}
        <div className="mt-14 hidden overflow-hidden rounded-mk-xl border border-hairline shadow-mk sm:block">
          <div className="grid grid-cols-[1.5fr_1.3fr_1fr_1fr]">
            {/* Header */}
            <div className="bg-canvas-2 px-5 py-4" />
            <div className="relative bg-brand-500 px-5 py-4">
              <Logo tone="light" />
            </div>
            <div className="bg-canvas-2 px-5 py-4 text-sm font-semibold text-slate-1">
              Canny
            </div>
            <div className="bg-canvas-2 px-5 py-4 text-sm font-semibold text-slate-1">
              Upvoty
            </div>

            {/* Rows */}
            {ROWS.map(({ feature, ir, canny, upvoty }, i) => (
              <div className="contents" key={feature}>
                <div
                  className={`flex items-center px-5 py-4 text-sm font-medium text-ink ${i % 2 ? "bg-canvas-2/40" : "bg-surface"}`}
                >
                  {feature}
                </div>
                <div
                  className={`flex items-center gap-2 border-x border-brand-100 px-5 py-4 ${i % 2 ? "bg-brand-50/70" : "bg-brand-50/40"}`}
                >
                  <Check
                    aria-hidden="true"
                    className="size-4 shrink-0 text-brand-600"
                  />
                  <span className="text-sm font-semibold text-brand-800">
                    {ir}
                  </span>
                </div>
                <div
                  className={`flex items-center px-5 py-4 ${i % 2 ? "bg-canvas-2/40" : "bg-surface"}`}
                >
                  <CompetitorCell cell={canny} />
                </div>
                <div
                  className={`flex items-center px-5 py-4 ${i % 2 ? "bg-canvas-2/40" : "bg-surface"}`}
                >
                  <CompetitorCell cell={upvoty} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile stacked cards */}
        <div className="mt-12 space-y-3 sm:hidden">
          {ROWS.map(({ feature, ir, canny, upvoty }) => (
            <div
              className="rounded-mk-lg border border-hairline bg-surface p-4 shadow-mk-xs"
              key={feature}
            >
              <p className="text-sm font-semibold text-ink">{feature}</p>
              <div className="mt-3 flex items-center gap-2 rounded-mk border border-brand-100 bg-brand-50/60 px-3 py-2">
                <Check
                  aria-hidden="true"
                  className="size-4 shrink-0 text-brand-600"
                />
                <span className="text-sm font-semibold text-brand-800">
                  IdeaRoads · {ir}
                </span>
              </div>
              <div className="mt-2 flex flex-col gap-1.5 px-1">
                <span className="text-xs text-slate-1">
                  Canny · {canny.text}
                </span>
                <span className="text-xs text-slate-1">
                  Upvoty · {upvoty.text}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-slate-2">
          Comparison based on publicly documented plans. IdeaRoads is not
          affiliated with Canny or Upvoty.
        </p>

        <div className="mt-8 flex justify-center">
          <CtaButton href="/login">Start free</CtaButton>
        </div>
      </div>
    </section>
  );
}

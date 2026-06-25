import { Boxes, Hexagon, Layers, Orbit, Triangle, Zap } from "lucide-react";

const LOGOS = [
  { name: "Northwind", Icon: Orbit },
  { name: "Lumen", Icon: Zap },
  { name: "Cedar", Icon: Triangle },
  { name: "Apexly", Icon: Hexagon },
  { name: "Hatch", Icon: Layers },
  { name: "Vantage", Icon: Boxes },
] as const;

export function LogosStrip() {
  return (
    <section className="border-y border-hairline bg-canvas">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-2">
          Trusted by product teams at fast-growing companies
        </p>
        <div className="mt-7 grid grid-cols-2 items-center gap-x-6 gap-y-7 sm:grid-cols-3 lg:grid-cols-6">
          {LOGOS.map(({ name, Icon }) => (
            <div
              className="flex items-center justify-center gap-2 text-slate-1 transition-colors duration-150 hover:text-ink"
              key={name}
            >
              <Icon aria-hidden="true" className="size-5" />
              <span className="mk-display text-lg font-bold tracking-tight">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BrowserFrame({
  url,
  children,
  className,
}: {
  url: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "overflow-hidden rounded-mk-xl border border-hairline bg-surface shadow-mk-lg",
        className
      )}
    >
      <div className="flex items-center gap-3 border-b border-hairline bg-canvas-2/70 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-hairline-strong" />
          <span className="size-2.5 rounded-full bg-hairline-strong" />
          <span className="size-2.5 rounded-full bg-hairline-strong" />
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-mk-sm border border-hairline bg-surface px-3 py-1">
          <span className="size-1.5 rounded-full bg-mint-400" />
          <span className="text-xs text-slate-1">{url}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

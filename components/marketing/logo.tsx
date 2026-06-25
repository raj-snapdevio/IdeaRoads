import { Waypoints } from "lucide-react";
import { PRODUCT_NAME } from "@/config/platform";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="mk-btn-fill flex size-8 items-center justify-center rounded-mk-sm text-white shadow-mk-brand">
        <Waypoints aria-hidden="true" className="size-[1.05rem]" />
      </span>
      <span
        className={cn(
          "mk-display text-[1.2rem] font-bold tracking-tight",
          tone === "light" ? "text-white" : "text-ink"
        )}
      >
        {PRODUCT_NAME}
      </span>
    </span>
  );
}

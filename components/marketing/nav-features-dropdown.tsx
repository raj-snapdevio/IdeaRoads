"use client";

import { BarChart3, BookOpen, ChevronDown, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const FEATURE_LINKS = [
  {
    icon: LayoutGrid,
    label: "Feedback Boards",
    tagline: "One place for every feature request",
    href: "/features/feedback-boards",
  },
  {
    icon: BarChart3,
    label: "Public Roadmap",
    tagline: "Your roadmap updates itself",
    href: "/features/roadmap",
  },
  {
    icon: BookOpen,
    label: "Changelog",
    tagline: "Every voter hears from you automatically",
    href: "/features/changelog",
  },
] as const;

export function NavFeaturesDropdown() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Trigger */}
      <button
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1 px-3 py-2 text-xs font-semibold uppercase tracking-ui text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
          }
          if (e.key === "Enter" || e.key === " ") {
            setOpen((v) => !v);
          }
        }}
        type="button"
      >
        Features
        <ChevronDown
          aria-hidden="true"
          className={`size-3.5 transition-transform duration-150 ${open ? "-rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-px w-72 border border-border bg-background">
          {/* Feature links */}
          <div>
            {FEATURE_LINKS.map(({ icon: Icon, label, tagline, href }) => (
              <Link
                className="flex items-start gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-muted"
                href={href}
                key={label}
                onClick={() => setOpen(false)}
              >
                <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center border border-border bg-muted">
                  <Icon
                    aria-hidden="true"
                    className="size-3.5 text-foreground"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {label}
                  </p>
                  <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                    {tagline}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Footer link */}
          <div className="border-t border-border px-4 py-3">
            <Link
              className="text-xs font-semibold uppercase tracking-ui text-muted-foreground transition-colors duration-150 hover:text-foreground"
              href="/features"
              onClick={() => setOpen(false)}
            >
              All Features →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface WorkspaceOption {
  name: string;
  slug: string;
}

interface WorkspaceSwitcherProps {
  currentName: string;
  currentSlug: string;
  workspaces: WorkspaceOption[];
}

export function WorkspaceSwitcher({
  currentName,
  currentSlug,
  workspaces,
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center gap-2.5 px-4 h-14 border-b border-sidebar-border text-left cursor-pointer transition-colors duration-150 hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <div className="flex size-7 shrink-0 items-center justify-center bg-primary text-primary-foreground">
          <span className="text-xs font-black">
            {currentName.charAt(0).toUpperCase()}
          </span>
        </div>
        <span
          className="flex-1 truncate text-sm font-semibold text-sidebar-foreground"
          title={currentName}
        >
          {currentName}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-sidebar-foreground/40" />
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-[52px] z-20 border border-sidebar-border bg-sidebar shadow-lg">
          <div className="max-h-64 overflow-y-auto py-1">
            {workspaces.map((ws) => {
              const isCurrent = ws.slug === currentSlug;
              return (
                <Link
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-sidebar-foreground/80 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={`/${ws.slug}`}
                  key={ws.slug}
                  onClick={() => setOpen(false)}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center bg-primary/10 text-[10px] font-black text-primary">
                    {ws.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate" title={ws.name}>
                    {ws.name}
                  </span>
                  {isCurrent && (
                    <Check className="size-3.5 shrink-0 text-sidebar-foreground/60" />
                  )}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-sidebar-border py-1">
            <Link
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/onboarding?new=1"
              onClick={() => setOpen(false)}
            >
              <span className="flex size-5 shrink-0 items-center justify-center">
                <Plus className="size-4" />
              </span>
              Create workspace
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CtaButton } from "@/components/marketing/cta-button";
import { Logo } from "@/components/marketing/logo";

const NAV_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Demo", href: "/demo" },
  { label: "Roadmap", href: "/features/roadmap" },
  { label: "Changelog", href: "/features/changelog" },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-hairline/80 bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          aria-label={`${"IdeaRoads"} home`}
          className="rounded-mk-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          href="/"
        >
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              className="rounded-mk-sm px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors duration-150 hover:bg-brand-50 hover:text-brand-700"
              href={href}
              key={label}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            className="hidden rounded-mk-sm px-3.5 py-2 text-sm font-semibold text-ink-soft transition-colors duration-150 hover:text-ink sm:inline-flex"
            href="/login"
          >
            Sign in
          </Link>
          <CtaButton className="hidden sm:inline-flex" href="/login" size="md">
            Start free
          </CtaButton>

          <button
            aria-controls="mobile-nav"
            aria-expanded={open}
            aria-label="Toggle menu"
            className="flex size-10 items-center justify-center rounded-mk-sm text-ink transition-colors duration-150 hover:bg-brand-50 md:hidden"
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            {open ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </div>

      {open && (
        <div
          className="border-t border-hairline bg-canvas md:hidden"
          id="mobile-nav"
        >
          <nav
            aria-label="Mobile"
            className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4 sm:px-8"
          >
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                className="rounded-mk-sm px-3 py-2.5 text-base font-medium text-ink transition-colors duration-150 hover:bg-brand-50 hover:text-brand-700"
                href={href}
                key={label}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-hairline pt-4">
              <CtaButton
                href="/login"
                onClick={() => setOpen(false)}
                size="md"
                variant="secondary"
              >
                Sign in
              </CtaButton>
              <CtaButton href="/login" onClick={() => setOpen(false)} size="md">
                Start free
              </CtaButton>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

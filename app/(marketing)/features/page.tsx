import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  LayoutGrid,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CtaButton } from "@/components/marketing/cta-button";
import { FinalCta } from "@/components/marketing/final-cta";
import { PRODUCT_NAME } from "@/config/platform";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Everything a product team needs to collect feedback, manage a roadmap, and ship with confidence. Every feature included, no per-voter fees.",
};

const MAJOR_FEATURES = [
  {
    icon: LayoutGrid,
    title: "Feedback Boards",
    tagline: "One place for every feature request.",
    description:
      "Users submit ideas, vote on what matters most, and leave comments. You get a ranked, organized list of exactly what to build next — not what the loudest voice asked for.",
    included: [
      "Public & private boards",
      "Voting & upvoting",
      "Merge duplicate posts",
      "Status management",
    ],
    href: "/features/feedback-boards",
  },
  {
    icon: BarChart3,
    title: "Public Roadmap",
    tagline: "Your roadmap updates itself.",
    description:
      "Change a post status and it moves on your public roadmap instantly. No separate Notion doc to maintain. No manual sync between tools.",
    included: [
      "Auto-syncs with board statuses",
      "Custom status labels",
      "Public shareable URL",
      "User-facing roadmap portal",
    ],
    href: "/features/roadmap",
  },
  {
    icon: BookOpen,
    title: "Changelog",
    tagline: "Every voter hears from you automatically.",
    description:
      "Write a release note, link the posts you shipped, and IdeaRoads emails every voter automatically. The loop closes without any manual work.",
    included: [
      "Release notes with linked posts",
      "Automatic voter notifications",
      "Public changelog page",
      "Subscribe & RSS feed",
    ],
    href: "/features/changelog",
  },
] as const;

const ALL_FEATURES = [
  {
    category: "Feedback Boards",
    items: [
      "Voting boards (public & private)",
      "Post submission & comments",
      "Merge duplicate posts",
      "Custom categories & tags",
      "Post moderation queue",
      "Sort by votes, recent, or trending",
      "Guest voting — no signup needed",
      "Board search & filtering",
    ],
  },
  {
    category: "Public Roadmap",
    items: [
      "Kanban-style roadmap view",
      "Auto-sync with post statuses",
      "Custom status labels",
      "Estimated launch dates",
      "Public roadmap URL",
      "Filter by board or category",
      "Follow specific roadmap items",
    ],
  },
  {
    category: "Changelog",
    items: [
      "Release notes with markdown",
      "Link posts to releases",
      "Auto-notify voters on publish",
      "Public changelog page",
      "Changelog subscribe & RSS",
      "Release categories (feature, fix, improvement)",
    ],
  },
  {
    category: "Team & Platform",
    items: [
      "Team roles & permissions",
      "Custom branding & domain",
      "Email notifications",
      "REST API & webhooks",
      "Self-hosted option",
      "Open source — MIT license",
    ],
  },
] as const;

export default function FeaturesPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-canvas">
        <div aria-hidden="true" className="mk-aura absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
          <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50/70 px-3 py-1 text-xs font-semibold text-brand-700">
            Features
          </span>
          <h1 className="mk-display mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] text-ink sm:text-6xl">
            Close the feedback loop,{" "}
            <span className="mk-gradient-text">automatically.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-soft">
            From the first feature request to the shipped notification —{" "}
            {PRODUCT_NAME} connects every step in one place. No duct tape, no
            manual sync.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <CtaButton href="/login">Start free</CtaButton>
            <CtaButton href="/demo" variant="secondary">
              View demo
            </CtaButton>
          </div>
        </div>
      </section>

      {/* Three major feature panels */}
      <section className="bg-canvas-2">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="grid gap-6 lg:grid-cols-3">
            {MAJOR_FEATURES.map(
              ({ icon: Icon, title, tagline, description, included, href }) => (
                <div
                  className="flex flex-col rounded-mk-xl border border-hairline bg-surface p-7 shadow-mk-sm transition-all duration-150 hover:-translate-y-1 hover:shadow-mk"
                  key={title}
                >
                  <span className="flex size-11 items-center justify-center rounded-mk bg-brand-50 text-brand-600">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h2 className="mk-display mt-4 text-xl font-bold text-ink">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-brand-600">
                    {tagline}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-1">
                    {description}
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {included.map((item) => (
                      <li
                        className="flex items-center gap-2.5 text-sm text-ink"
                        key={item}
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                          <Check aria-hidden="true" className="size-3" />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-brand-700 transition-colors duration-150 hover:text-brand-500"
                    href={href}
                  >
                    Explore {title}
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Full features list */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-hairline bg-canvas-2 px-3 py-1 text-xs font-semibold text-slate-1">
              Everything included
            </span>
            <h2 className="mk-display mt-5 text-3xl font-bold text-ink sm:text-4xl">
              Every feature. Every plan.
            </h2>
            <p className="mt-4 text-lg text-ink-soft">
              No feature gating. No per-voter fees. No surprise add-ons.
            </p>
          </div>

          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {ALL_FEATURES.map(({ category, items }) => (
              <div key={category}>
                <p className="border-b border-hairline pb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-2">
                  {category}
                </p>
                <ul className="mt-4 space-y-3">
                  {items.map((item) => (
                    <li
                      className="flex items-start gap-2.5 text-sm text-ink"
                      key={item}
                    >
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                        <Check aria-hidden="true" className="size-3" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}

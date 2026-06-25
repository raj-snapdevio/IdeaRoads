import { ChevronUp, MessageSquare, Settings2, Users } from "lucide-react";
import type { Metadata } from "next";
import { CtaButton } from "@/components/marketing/cta-button";
import { FinalCta } from "@/components/marketing/final-cta";

export const metadata: Metadata = {
  title: "Demo",
  description:
    "See IdeaRoads in action. Explore the public feedback board, admin workspace, and automated notifications — no account required.",
};

/* ─── Frame chrome ─────────────────────────────────────────────────── */

function Frame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-mk-xl border border-hairline bg-surface shadow-mk-lg"
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

/* ─── Public board mockup ──────────────────────────────────────────── */

const BOARD_POSTS = [
  {
    votes: 67,
    title: "Dark mode support",
    status: "Planned",
    category: "Design",
    comments: 14,
    voted: true,
  },
  {
    votes: 42,
    title: "Custom webhook integrations",
    status: "In Progress",
    category: "Developer",
    comments: 11,
    voted: false,
  },
  {
    votes: 31,
    title: "Export feedback to CSV",
    status: "Planned",
    category: "Data",
    comments: 7,
    voted: false,
  },
  {
    votes: 24,
    title: "Two-factor authentication",
    status: "Open",
    category: "Security",
    comments: 4,
    voted: false,
  },
] as const;

function PublicBoardMockup() {
  return (
    <Frame url="feedback.acme.com/feature-requests">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <span className="mk-display text-sm font-bold text-ink">
          Feature Requests
        </span>
        <span className="mk-btn-fill rounded-mk-sm px-3 py-1.5 text-xs font-semibold text-white">
          + Submit Idea
        </span>
      </div>
      <div className="space-y-2 px-3 pb-4">
        {BOARD_POSTS.map((post) => (
          <div
            className={`flex items-center gap-3 rounded-mk-lg border p-3 ${
              post.voted
                ? "border-brand-200 bg-brand-50/50"
                : "border-hairline bg-surface"
            }`}
            key={post.title}
          >
            <div
              className={`flex w-11 shrink-0 flex-col items-center gap-0.5 rounded-mk border py-2 ${
                post.voted
                  ? "border-brand-300 bg-brand-500 text-white"
                  : "border-hairline bg-canvas-2 text-ink"
              }`}
            >
              <ChevronUp aria-hidden="true" className="size-4" />
              <span className="text-sm font-bold tabular-nums">
                {post.votes}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {post.title}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                    post.status === "Open"
                      ? "bg-canvas-2 text-slate-1"
                      : "bg-brand-50 text-brand-700"
                  }`}
                >
                  {post.status}
                </span>
                <span className="text-xs text-slate-2">{post.category}</span>
                <span className="flex items-center gap-1 text-xs text-slate-2">
                  <MessageSquare aria-hidden="true" className="size-3" />
                  {post.comments}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ─── Admin workspace mockup ───────────────────────────────────────── */

const BOARDS: {
  name: string;
  posts: number;
  activity: string;
  lead?: boolean;
}[] = [
  {
    name: "Feature Requests",
    posts: 67,
    activity: "Updated 2h ago",
    lead: true,
  },
  { name: "Bug Reports", posts: 12, activity: "Updated 1d ago" },
  { name: "Design Feedback", posts: 7, activity: "Updated 3d ago" },
];

function AdminWorkspaceMockup() {
  return (
    <Frame url="app.idearoads.com/workspace">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-mk bg-linear-to-br from-brand-500 to-grape-500 text-sm font-bold text-white">
            A
          </span>
          <div>
            <p className="text-sm font-bold text-ink">Acme Corp</p>
            <p className="text-xs text-slate-1">Workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-slate-1">
          <Users aria-hidden="true" className="size-4" />
          <Settings2 aria-hidden="true" className="size-4" />
        </div>
      </div>
      <div className="flex items-center justify-between border-y border-hairline px-5 py-3">
        <span className="text-sm font-semibold text-ink">Boards</span>
        <span className="mk-btn-fill rounded-mk-sm px-2.5 py-1 text-xs font-semibold text-white">
          + New Board
        </span>
      </div>
      <div className="divide-y divide-hairline">
        {BOARDS.map(({ name, posts, activity, lead }) => (
          <div
            className="flex items-center justify-between px-5 py-3.5"
            key={name}
          >
            <div>
              <p className="text-sm font-medium text-ink">{name}</p>
              <p className="mt-0.5 text-xs text-slate-1">
                {posts} posts · {activity}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
                lead ? "bg-brand-50 text-brand-700" : "bg-canvas-2 text-slate-1"
              }`}
            >
              {posts}
            </span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ─── Email notification mockup ────────────────────────────────────── */

function EmailMockup() {
  return (
    <Frame url="Inbox · alex@example.com">
      <div className="space-y-1.5 border-b border-hairline bg-canvas-2/60 px-5 py-3">
        {[
          ["From", "IdeaRoads · Acme Corp"],
          ["To", "alex@example.com"],
          ["Subject", "Dark mode just shipped — you asked for this"],
        ].map(([k, v]) => (
          <div className="flex gap-3" key={k}>
            <span className="w-14 shrink-0 text-xs font-semibold text-slate-2">
              {k}
            </span>
            <span
              className={`text-xs ${k === "Subject" ? "font-semibold text-ink" : "text-slate-1"}`}
            >
              {v}
            </span>
          </div>
        ))}
      </div>
      <div className="space-y-3 p-5 text-sm">
        <p className="text-ink">Hi Alex,</p>
        <p className="leading-6 text-slate-1">
          Something you voted for just shipped. The team at Acme Corp has
          published a new update.
        </p>
        <div className="rounded-mk-lg border border-hairline bg-canvas-2/60 p-3.5">
          <p className="text-sm font-semibold text-ink">Dark mode is here</p>
          <p className="mt-0.5 text-xs text-slate-2">Jun 24, 2026 · Feature</p>
          <p className="mt-1.5 text-xs leading-5 text-slate-1">
            Toggle it in your profile settings. Available on all workspaces now.
          </p>
        </div>
        <p className="text-xs text-slate-2">
          You&apos;re receiving this because you voted for this feature.{" "}
          <span className="text-brand-600 underline">Unsubscribe</span>
        </p>
      </div>
    </Frame>
  );
}

/* ─── Demo sections ────────────────────────────────────────────────── */

const DEMO_SECTIONS = [
  {
    step: "01",
    label: "Public Feedback Board",
    heading: "What your users see.",
    description:
      "A clean, branded board where users submit ideas, upvote what matters, and follow progress. No account required to vote.",
    Mockup: PublicBoardMockup,
  },
  {
    step: "02",
    label: "Admin Workspace",
    heading: "What your team manages.",
    description:
      "Your workspace dashboard shows all boards in one place. Triage posts, change statuses, merge duplicates, and build your roadmap.",
    Mockup: AdminWorkspaceMockup,
  },
  {
    step: "03",
    label: "Voter Notification",
    heading: "What voters receive automatically.",
    description:
      "The moment you publish a changelog entry, every voter who asked for the feature gets this email. No manual outreach needed.",
    Mockup: EmailMockup,
  },
] as const;

export default function DemoPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-canvas">
        <div aria-hidden="true" className="mk-aura absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50/70 px-3 py-1 text-xs font-semibold text-brand-700">
            Live demo
          </span>
          <h1 className="mk-display mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] text-ink sm:text-6xl">
            See IdeaRoads <span className="mk-gradient-text">in action.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-soft">
            Here&apos;s exactly what your users see, what your team manages, and
            what happens automatically when you ship. No account required.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <CtaButton href="/login">Start free</CtaButton>
            <CtaButton href="/features" variant="secondary">
              See all features
            </CtaButton>
          </div>
        </div>
      </section>

      {/* Demo sections */}
      <section className="bg-canvas-2">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="space-y-16 lg:space-y-24">
            {DEMO_SECTIONS.map(
              ({ step, label, heading, description, Mockup }, i) => (
                <div
                  className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16"
                  key={step}
                >
                  <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                    <div className="flex items-center gap-3">
                      <span className="mk-display flex size-9 items-center justify-center rounded-mk bg-brand-500 text-sm font-bold text-white shadow-mk-brand">
                        {step}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                        {label}
                      </span>
                    </div>
                    <h2 className="mk-display mt-5 text-2xl font-bold text-ink sm:text-3xl">
                      {heading}
                    </h2>
                    <p className="mt-3 max-w-md text-base leading-7 text-ink-soft">
                      {description}
                    </p>
                  </div>
                  <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                    <Mockup />
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}

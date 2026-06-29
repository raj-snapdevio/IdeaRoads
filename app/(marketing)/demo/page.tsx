import { ChevronUp, MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Demo",
  description:
    "See IdeaRoads in action. Explore the public feedback board, admin workspace, and automated notifications — no account required.",
};

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
    <div aria-hidden="true" className="border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border bg-muted px-4 py-3">
        <div className="flex shrink-0 gap-1.5">
          <span className="block size-2.5 bg-border" />
          <span className="block size-2.5 bg-border" />
          <span className="block size-2.5 bg-border" />
        </div>
        <div className="min-w-0 flex-1 border border-border bg-background px-3 py-1 text-center">
          <span className="font-mono text-2xs text-muted-foreground">
            feedback.acme.com/boards/feature-requests
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold text-foreground">
          Feature Requests
        </span>
        <span className="border border-border px-2 py-0.5 text-2xs font-semibold uppercase tracking-ui text-foreground">
          + Submit Idea
        </span>
      </div>
      <div className="divide-y divide-border">
        {BOARD_POSTS.map((post) => (
          <div className="flex items-stretch" key={post.title}>
            <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-border px-2 py-3">
              <ChevronUp
                aria-hidden="true"
                className={`size-4 ${post.voted ? "text-success" : "text-muted-foreground"}`}
              />
              <span
                className={`font-mono text-sm font-semibold ${post.voted ? "text-success" : "text-foreground"}`}
              >
                {post.votes}
              </span>
            </div>
            <div className="min-w-0 flex-1 px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm font-medium text-foreground">
                  {post.title}
                </span>
                <span
                  className={`shrink-0 text-2xs font-semibold uppercase tracking-ui ${post.status === "Open" ? "text-muted-foreground" : "text-success"}`}
                >
                  {post.status}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-muted-foreground">
                <span className="text-2xs font-semibold uppercase tracking-ui">
                  {post.category}
                </span>
                <span className="text-2xs">·</span>
                <div className="flex items-center gap-1">
                  <MessageSquare aria-hidden="true" className="size-3" />
                  <span className="text-2xs">{post.comments}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Admin workspace mockup ───────────────────────────────────────── */

const BOARDS = [
  { name: "Feature Requests", posts: 67, activity: "Updated 2h ago" },
  { name: "Bug Reports", posts: 12, activity: "Updated 1d ago" },
  { name: "Design Feedback", posts: 7, activity: "Updated 3d ago" },
] as const;

function AdminWorkspaceMockup() {
  return (
    <div aria-hidden="true" className="border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border bg-muted px-4 py-3">
        <div className="flex shrink-0 gap-1.5">
          <span className="block size-2.5 bg-border" />
          <span className="block size-2.5 bg-border" />
          <span className="block size-2.5 bg-border" />
        </div>
        <div className="min-w-0 flex-1 border border-border bg-background px-3 py-1 text-center">
          <span className="font-mono text-2xs text-muted-foreground">
            app.idearoads.com/workspace
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-ui text-muted-foreground">
            Workspace
          </p>
          <p className="text-sm font-semibold text-foreground">Acme Corp</p>
        </div>
        <span className="text-2xs font-semibold uppercase tracking-ui text-muted-foreground">
          Team · Settings
        </span>
      </div>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold text-foreground">Boards</span>
        <span className="border border-border px-2 py-0.5 text-2xs font-semibold uppercase tracking-ui text-foreground">
          + New Board
        </span>
      </div>
      <div className="divide-y divide-border">
        {BOARDS.map(({ name, posts, activity }) => (
          <div
            className="flex items-center justify-between px-4 py-3.5"
            key={name}
          >
            <div>
              <p className="text-sm font-medium text-foreground">{name}</p>
              <p className="mt-0.5 text-2xs text-muted-foreground">
                {posts} posts · {activity}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                {posts}
              </span>
              <span className="text-sm text-muted-foreground">→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Email notification mockup ────────────────────────────────────── */

function EmailMockup() {
  return (
    <div aria-hidden="true" className="border border-border bg-card">
      <div className="space-y-1.5 border-b border-border bg-muted px-4 py-3">
        <div className="flex gap-3">
          <span className="w-14 shrink-0 text-2xs font-semibold uppercase tracking-ui text-muted-foreground">
            From
          </span>
          <span className="text-2xs text-foreground">
            IdeaRoads · Acme Corp &lt;noreply@acme.com&gt;
          </span>
        </div>
        <div className="flex gap-3">
          <span className="w-14 shrink-0 text-2xs font-semibold uppercase tracking-ui text-muted-foreground">
            To
          </span>
          <span className="text-2xs text-foreground">alex@example.com</span>
        </div>
        <div className="flex gap-3">
          <span className="w-14 shrink-0 text-2xs font-semibold uppercase tracking-ui text-muted-foreground">
            Subject
          </span>
          <span className="text-2xs font-semibold text-foreground">
            Dark mode just shipped you asked for this
          </span>
        </div>
      </div>
      <div className="space-y-3 p-5 text-sm">
        <p className="text-foreground">Hi Alex,</p>
        <p className="leading-5 text-muted-foreground">
          Something you voted for just shipped. The team at Acme Corp has
          published a new update.
        </p>
        <div className="border border-border bg-muted p-3">
          <p className="text-xs font-semibold text-foreground">
            Dark mode is here
          </p>
          <p className="mt-0.5 text-2xs text-muted-foreground">
            Jun 24, 2026 · Feature
          </p>
          <p className="mt-1.5 text-xs leading-4 text-muted-foreground">
            Toggle it in your profile settings. Available on all workspaces now.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          You&apos;re receiving this because you voted for this feature.{" "}
          <span className="underline">Unsubscribe</span>
        </p>
      </div>
    </div>
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
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <p className="font-bold text-xs uppercase tracking-eyebrow text-success">
            Live Demo
          </p>
          <h1 className="mt-4 font-black text-5xl tracking-normal text-foreground sm:text-6xl">
            See IdeaRoads
            <br className="hidden sm:block" /> in action.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Here&apos;s exactly what your users see, what your team manages, and
            what happens automatically when you ship. No account required.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/login">Start Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/features">See All Features →</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Demo sections */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
          <div className="divide-y divide-border border-t border-border">
            {DEMO_SECTIONS.map(
              ({ step, label, heading, description, Mockup }) => (
                <div
                  className="grid gap-8 py-16 lg:grid-cols-[4fr_8fr] lg:items-start lg:gap-16"
                  key={step}
                >
                  <div className="lg:pt-2">
                    <span className="font-mono text-2xs text-muted-foreground">
                      {step}
                    </span>
                    <p className="mt-1 font-bold text-xs uppercase tracking-eyebrow text-success">
                      {label}
                    </p>
                    <h2 className="mt-3 font-bold text-2xl text-foreground">
                      {heading}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                  <Mockup />
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted">
        <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-8">
          <h2 className="font-black text-3xl text-foreground sm:text-4xl">
            Ready to set up your own?
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            No credit card required. Your first board is live in minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/login">Start Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/features">Explore Features →</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

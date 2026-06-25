import {
  Bell,
  ChevronUp,
  Inbox,
  Map as MapIcon,
  Megaphone,
  MessageSquare,
  Rocket,
  ThumbsUp,
} from "lucide-react";

/* ─── Closed-loop strip ────────────────────────────────────────────── */

const LOOP_STEPS = [
  { label: "Collect", Icon: Inbox },
  { label: "Vote", Icon: ThumbsUp },
  { label: "Plan", Icon: MapIcon },
  { label: "Ship", Icon: Rocket },
  { label: "Announce", Icon: Megaphone },
  { label: "Notify", Icon: Bell },
] as const;

function LoopStrip() {
  return (
    <div className="mt-12 flex flex-wrap items-center justify-center gap-2.5">
      {LOOP_STEPS.map(({ label, Icon }, i) => (
        <div className="flex items-center gap-2.5" key={label}>
          <div className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-3.5 py-2 shadow-mk-xs">
            <Icon aria-hidden="true" className="size-4 text-brand-500" />
            <span className="text-sm font-semibold text-ink">{label}</span>
          </div>
          {i < LOOP_STEPS.length - 1 && (
            <span aria-hidden="true" className="text-slate-2">
              →
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Frame chrome ─────────────────────────────────────────────────── */

function Frame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-mk-xl border border-hairline bg-surface shadow-mk-lg">
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

/* ─── Board mockup ─────────────────────────────────────────────────── */

const BOARD_POSTS = [
  {
    votes: 42,
    title: "Add dark mode support",
    status: "Planned",
    category: "Design",
    comments: 8,
  },
  {
    votes: 31,
    title: "Custom webhook integrations",
    status: "In Progress",
    category: "Developer",
    comments: 11,
  },
  {
    votes: 24,
    title: "Export feedback to CSV",
    status: "Planned",
    category: "Data",
    comments: 6,
  },
] as const;

function BoardMockup() {
  return (
    <Frame url="acme.idearoads.com/feature-requests">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <span className="mk-display text-sm font-bold text-ink">
          Feature Requests
        </span>
        <span className="text-xs font-medium text-slate-1">48 posts</span>
      </div>
      <div className="space-y-2 px-3 pb-4">
        {BOARD_POSTS.map((post) => (
          <div
            className="flex items-center gap-3 rounded-mk-lg border border-hairline bg-surface p-3"
            key={post.title}
          >
            <div className="flex w-10 shrink-0 flex-col items-center gap-0.5 rounded-mk border border-hairline bg-canvas-2 py-1.5">
              <ChevronUp
                aria-hidden="true"
                className="size-3.5 text-brand-500"
              />
              <span className="text-sm font-bold text-ink tabular-nums">
                {post.votes}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {post.title}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[0.65rem] font-semibold text-brand-700">
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

/* ─── Roadmap mockup ───────────────────────────────────────────────── */

const ROADMAP_COLUMNS = [
  {
    label: "Planned",
    tone: "text-slate-1",
    cards: [
      "Add dark mode support",
      "Export feedback to CSV",
      "Custom email templates",
    ],
  },
  {
    label: "In Progress",
    tone: "text-brand-700",
    cards: ["Custom webhook integrations", "Zapier integration"],
  },
  {
    label: "Completed",
    tone: "text-[oklch(0.5_0.13_165)]",
    cards: ["Board sorting options", "Guest voting via email"],
  },
] as const;

function RoadmapMockup() {
  return (
    <Frame url="acme.idearoads.com/roadmap">
      <div className="grid grid-cols-3 gap-3 p-4">
        {ROADMAP_COLUMNS.map(({ label, tone, cards }) => (
          <div key={label}>
            <div className="mb-2 flex items-center justify-between">
              <span className={`text-xs font-bold ${tone}`}>{label}</span>
              <span className="text-xs text-slate-2">{cards.length}</span>
            </div>
            <div className="space-y-2">
              {cards.map((title) => (
                <div
                  className="rounded-mk border border-hairline bg-canvas-2/60 p-2.5"
                  key={title}
                >
                  <p className="text-xs font-medium leading-4 text-ink">
                    {title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ─── Changelog mockup ─────────────────────────────────────────────── */

function ChangelogMockup() {
  return (
    <Frame url="acme.idearoads.com/changelog">
      <div className="p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[0.65rem] font-semibold text-brand-700">
            New feature
          </span>
          <span className="text-xs text-slate-1">Jun 24, 2026</span>
        </div>
        <h4 className="mk-display mt-3 text-base font-bold text-ink">
          Dark mode is here
        </h4>
        <p className="mt-2 text-sm leading-6 text-slate-1">
          After 42 votes and months of work, dark mode is now available for all
          workspaces. Toggle it in your profile settings.
        </p>
        <div className="mt-5 border-t border-hairline pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-2">
            Delivered
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-mk border border-hairline bg-canvas-2/60 px-3 py-2">
            <ChevronUp aria-hidden="true" className="size-3.5 text-brand-500" />
            <span className="text-xs font-bold text-ink">42</span>
            <span className="text-xs font-medium text-ink">
              Add dark mode support
            </span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ─── Email mockup ─────────────────────────────────────────────────── */

function EmailMockup() {
  return (
    <Frame url="Inbox · alex@example.com">
      <div className="space-y-1.5 border-b border-hairline bg-canvas-2/60 px-5 py-3">
        {[
          ["From", "IdeaRoads · Acme Corp"],
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
          <p className="mt-0.5 text-xs text-slate-2">Jun 24, 2026</p>
          <p className="mt-1.5 text-xs leading-5 text-slate-1">
            Toggle it in your profile settings. Available on all workspaces now.
          </p>
        </div>
        <p className="text-xs text-slate-2">
          You're receiving this because you voted for this feature.{" "}
          <span className="text-brand-600 underline">Unsubscribe</span>
        </p>
      </div>
    </Frame>
  );
}

/* ─── Frames ───────────────────────────────────────────────────────── */

const FRAMES = [
  {
    step: "01",
    eyebrow: "Collect",
    heading: "Feedback lands where it belongs.",
    caption:
      "Users submit requests directly to your board — no email, no Notion. Vote counts tell you exactly which problems are blocking the most users.",
    Mockup: BoardMockup,
  },
  {
    step: "02",
    eyebrow: "Plan",
    heading: "Your roadmap updates itself.",
    caption:
      "Change a post status and it appears on your public roadmap instantly. No separate tool to maintain. No manual sync.",
    Mockup: RoadmapMockup,
  },
  {
    step: "03",
    eyebrow: "Announce",
    heading: "Ship with a story.",
    caption:
      "Write a changelog entry and link it to the posts you shipped. Your users see what changed and why.",
    Mockup: ChangelogMockup,
  },
  {
    step: "04",
    eyebrow: "Notify",
    heading: "Every voter hears from you.",
    caption:
      "Publishing a changelog entry automatically notifies everyone who voted for the linked posts. The loop closes without any manual work.",
    Mockup: EmailMockup,
  },
] as const;

export function ProductTour() {
  return (
    <section className="bg-canvas-2" id="how-it-works">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50/70 px-3 py-1 text-xs font-semibold text-brand-700">
            The closed loop
          </span>
          <h2 className="mk-display mt-5 text-3xl font-bold text-ink sm:text-4xl">
            From idea to inbox, in one place.
          </h2>
          <p className="mt-4 text-lg leading-8 text-ink-soft">
            Everything that happens between a user submitting a request and
            receiving a notification that it shipped — connected end to end.
          </p>
        </div>

        <LoopStrip />

        <div className="mt-16 space-y-16 lg:space-y-24">
          {FRAMES.map(({ step, eyebrow, heading, caption, Mockup }, i) => (
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
                    {eyebrow}
                  </span>
                </div>
                <h3 className="mk-display mt-5 text-2xl font-bold text-ink sm:text-3xl">
                  {heading}
                </h3>
                <p className="mt-3 max-w-md text-base leading-7 text-ink-soft">
                  {caption}
                </p>
              </div>
              <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                <Mockup />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

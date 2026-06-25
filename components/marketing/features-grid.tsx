import {
  ArrowUp,
  BarChart3,
  Bell,
  BookOpen,
  ChevronUp,
  LayoutGrid,
  Users,
} from "lucide-react";

type Feature = {
  icon: typeof LayoutGrid;
  title: string;
  description: string;
  wide?: boolean;
  accent?: string;
};

const FEATURES: Feature[] = [
  {
    icon: LayoutGrid,
    title: "Feedback Boards",
    description:
      "Users submit requests directly — no more ideas buried in your inbox or scattered across Slack and Notion. Organize them into public or private boards.",
    wide: true,
    accent: "from-brand-50 to-surface",
  },
  {
    icon: ArrowUp,
    title: "Voting",
    description:
      "Know exactly which problems block the most users, ranked by real signal — not by who emailed you last.",
  },
  {
    icon: BarChart3,
    title: "Public Roadmap",
    description:
      "Your roadmap updates automatically as you change post statuses. No separate Notion page to maintain.",
  },
  {
    icon: Users,
    title: "Team Roles",
    description:
      "Your whole team can triage feedback without sharing admin credentials. Invite by email or shareable link.",
  },
  {
    icon: BookOpen,
    title: "Changelog",
    description:
      "Every user who requested a feature gets an email the day you ship it. The loop closes automatically.",
  },
  {
    icon: Bell,
    title: "Email Notifications",
    description:
      "Users stay informed at every step — status changes, comments, and changelog updates, with one-click unsubscribe.",
    wide: true,
    accent: "from-grape-500/10 to-surface",
  },
];

function BoardPreview() {
  return (
    <div className="mt-5 hidden gap-2 sm:flex">
      {[42, 31, 24].map((v, i) => (
        <div
          className="flex flex-1 items-center gap-2 rounded-mk border border-hairline bg-surface px-2.5 py-2"
          key={v}
        >
          <span
            className={`flex flex-col items-center rounded-mk-sm px-1.5 py-0.5 text-xs font-bold ${
              i === 0 ? "bg-brand-500 text-white" : "bg-canvas-2 text-ink"
            }`}
          >
            <ChevronUp aria-hidden="true" className="size-3" />
            {v}
          </span>
          <span className="h-1.5 flex-1 rounded-full bg-hairline" />
        </div>
      ))}
    </div>
  );
}

function NotifyPreview() {
  return (
    <div className="mt-5 hidden items-center gap-3 rounded-mk-lg border border-hairline bg-surface p-3 sm:flex">
      <span className="flex size-9 items-center justify-center rounded-mk bg-brand-50 text-brand-600">
        <Bell aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-ink">
          Your request shipped 🎉
        </p>
        <p className="text-[0.7rem] text-slate-1">Sent to 128 voters</p>
      </div>
      <span className="rounded-full bg-mint-400/15 px-2 py-0.5 text-[0.65rem] font-semibold text-[oklch(0.5_0.12_165)]">
        Auto
      </span>
    </div>
  );
}

export function FeaturesGrid() {
  return (
    <section className="bg-canvas" id="features">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-hairline bg-canvas-2 px-3 py-1 text-xs font-semibold text-slate-1">
            What you get
          </span>
          <h2 className="mk-display mt-5 text-3xl font-bold text-ink sm:text-4xl">
            Everything a product team needs.
            <br className="hidden sm:block" /> Nothing they don't.
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description, wide, accent }) => (
            <div
              className={`group flex flex-col rounded-mk-xl border border-hairline bg-linear-to-b p-6 shadow-mk-sm transition-all duration-150 hover:-translate-y-1 hover:shadow-mk ${
                wide ? "sm:col-span-2 lg:col-span-2" : "lg:col-span-1"
              } ${accent ?? "from-surface to-surface"}`}
              key={title}
            >
              <span className="flex size-11 items-center justify-center rounded-mk border border-hairline bg-surface text-brand-600 shadow-mk-xs transition-colors duration-150 group-hover:border-brand-200 group-hover:bg-brand-50">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mk-display mt-4 text-lg font-bold text-ink">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-1">
                {description}
              </p>
              {wide && title === "Feedback Boards" && <BoardPreview />}
              {wide && title === "Email Notifications" && <NotifyPreview />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

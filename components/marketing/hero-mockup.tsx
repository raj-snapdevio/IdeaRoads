import {
  Bell,
  Check,
  ChevronUp,
  MessageSquare,
  TrendingUp,
} from "lucide-react";

type HeroPost = {
  votes: number;
  title: string;
  status: string;
  tone: string;
  category: string;
  comments: number;
  lead?: boolean;
};

const POSTS: HeroPost[] = [
  {
    votes: 128,
    title: "Dark mode across the dashboard",
    status: "In Progress",
    tone: "brand",
    category: "Design",
    comments: 24,
    lead: true,
  },
  {
    votes: 94,
    title: "Slack notifications for new posts",
    status: "Planned",
    tone: "amber",
    category: "Integrations",
    comments: 16,
  },
  {
    votes: 71,
    title: "Export feedback to CSV",
    status: "Planned",
    tone: "amber",
    category: "Data",
    comments: 9,
  },
  {
    votes: 58,
    title: "Single sign-on (SAML)",
    status: "Under review",
    tone: "slate",
    category: "Security",
    comments: 7,
  },
];

const STATUS_TONE: Record<string, string> = {
  brand: "bg-brand-50 text-brand-700",
  amber: "bg-sun-300/30 text-[oklch(0.45_0.12_70)]",
  slate: "bg-canvas-2 text-slate-1",
};

export function HeroMockup() {
  return (
    <div className="relative">
      {/* Product frame */}
      <div className="overflow-hidden rounded-mk-xl border border-hairline bg-surface shadow-mk-xl">
        {/* Browser chrome */}
        <div className="flex items-center gap-3 border-b border-hairline bg-canvas-2/70 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="size-3 rounded-full bg-hairline-strong" />
            <span className="size-3 rounded-full bg-hairline-strong" />
            <span className="size-3 rounded-full bg-hairline-strong" />
          </div>
          <div className="mx-auto flex items-center gap-1.5 rounded-mk-sm border border-hairline bg-surface px-3 py-1">
            <span className="size-1.5 rounded-full bg-mint-400" />
            <span className="text-xs text-slate-1">feedback.acme.com</span>
          </div>
        </div>

        {/* Board header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <p className="mk-display text-base font-bold text-ink">
              Feature Requests
            </p>
            <p className="mt-0.5 text-xs text-slate-1">
              312 ideas · sorted by votes
            </p>
          </div>
          <span className="mk-btn-fill rounded-mk-sm px-3 py-1.5 text-xs font-semibold text-white">
            + Submit
          </span>
        </div>

        {/* Posts */}
        <div className="space-y-2 px-3 pb-4">
          {POSTS.map((p) => (
            <div
              className={`flex items-center gap-3 rounded-mk-lg border p-3 transition-colors ${
                p.lead
                  ? "border-brand-200 bg-brand-50/50"
                  : "border-hairline bg-surface"
              }`}
              key={p.title}
            >
              <div
                className={`flex w-11 shrink-0 flex-col items-center gap-0.5 rounded-mk border py-2 ${
                  p.lead
                    ? "border-brand-300 bg-brand-500 text-white"
                    : "border-hairline bg-canvas-2 text-ink"
                }`}
              >
                <ChevronUp aria-hidden="true" className="size-4" />
                <span className="text-sm font-bold tabular-nums">
                  {p.votes}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {p.title}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${STATUS_TONE[p.tone]}`}
                  >
                    {p.status}
                  </span>
                  <span className="text-xs text-slate-2">{p.category}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-2">
                    <MessageSquare aria-hidden="true" className="size-3" />
                    {p.comments}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating: notification toast */}
      <div className="absolute -right-4 -top-5 hidden w-60 rounded-mk-lg border border-hairline bg-surface p-3.5 shadow-mk-lg sm:block">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-mk bg-brand-50 text-brand-600">
            <Bell aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink">
              Dark mode just shipped
            </p>
            <p className="mt-0.5 text-[0.7rem] leading-4 text-slate-1">
              128 voters notified automatically
            </p>
          </div>
        </div>
      </div>

      {/* Floating: weekly stat */}
      <div className="absolute -bottom-6 -left-5 hidden items-center gap-3 rounded-mk-lg border border-hairline bg-surface p-3.5 pr-5 shadow-mk-lg sm:flex">
        <span className="flex size-9 items-center justify-center rounded-mk bg-mint-400/15 text-[oklch(0.5_0.12_165)]">
          <TrendingUp aria-hidden="true" className="size-4" />
        </span>
        <div>
          <p className="text-sm font-bold text-ink">+412 votes</p>
          <p className="text-[0.7rem] text-slate-1">this week</p>
        </div>
      </div>

      {/* Floating: shipped badge */}
      <div className="absolute -right-3 bottom-16 hidden items-center gap-1.5 rounded-full border border-mint-400/40 bg-surface px-3 py-1.5 shadow-mk lg:flex">
        <Check
          aria-hidden="true"
          className="size-3.5 text-[oklch(0.5_0.13_165)]"
        />
        <span className="text-xs font-semibold text-ink">Loop closed</span>
      </div>
    </div>
  );
}

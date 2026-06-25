import { ChevronUp, MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import { BrowserFrame } from "@/components/marketing/browser-frame";
import { FeatureDetail } from "@/components/marketing/feature-detail";

export const metadata: Metadata = {
  title: "Feedback Boards",
  description:
    "One place for every feature request. Users submit and vote. You ship what matters most — not what the loudest voice asked for.",
};

const STATUS_FILTERS = ["All", "Open", "Planned", "In Progress", "Done"];

const POSTS = [
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
    status: "Planned",
    category: "Security",
    comments: 5,
    voted: false,
  },
  {
    votes: 18,
    title: "Zapier integration",
    status: "Open",
    category: "Integrations",
    comments: 3,
    voted: false,
  },
];

const BENEFITS = [
  {
    heading: "No more hunting for feedback.",
    body: "All feature requests live in one public board — not scattered across email, Slack, and Notion. Users find what they're looking for instead of creating duplicate requests.",
  },
  {
    heading: "Real signal, not loud voices.",
    body: "Vote counts show exactly which problems block the most users. One vocal user asking repeatedly ranks below forty users who each upvoted once.",
  },
  {
    heading: "Your team always knows what to build.",
    body: "A ranked, filtered, organized list of validated requests. Open the board and immediately see the highest-impact work — no estimation needed.",
  },
];

const FEATURE_LIST = [
  "Public & private boards",
  "Post submission & upvoting",
  "Comments & discussion threads",
  "Post status management",
  "Merge duplicate posts",
  "Custom categories & tags",
  "Post moderation queue",
  "Guest voting — no signup needed",
  "Sort by votes, recent, or trending",
  "Board search & filtering",
  "Custom board branding",
  "Embeddable board widget",
];

function BoardMockup() {
  return (
    <BrowserFrame url="feedback.acme.com/feature-requests">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-baseline gap-2">
          <span className="mk-display text-sm font-bold text-ink">
            Feature Requests
          </span>
          <span className="text-xs text-slate-1">67 posts</span>
        </div>
        <span className="mk-btn-fill rounded-mk-sm px-3 py-1.5 text-xs font-semibold text-white">
          + Submit Idea
        </span>
      </div>

      <div className="flex items-center gap-1 border-b border-hairline px-4">
        {STATUS_FILTERS.map((filter, i) => (
          <span
            className={`px-2.5 py-2.5 text-xs font-semibold ${
              i === 0
                ? "border-b-2 border-brand-500 text-brand-700"
                : "text-slate-1"
            }`}
            key={filter}
          >
            {filter}
          </span>
        ))}
      </div>

      <div className="space-y-2 p-3">
        {POSTS.map((post) => (
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
    </BrowserFrame>
  );
}

export default function FeedbackBoardsPage() {
  return (
    <FeatureDetail
      benefits={BENEFITS}
      ctaHeading="Ready to hear from your users?"
      ctaSubtitle="No credit card required. Set up your first board in minutes."
      eyebrow="Feedback Boards"
      features={FEATURE_LIST}
      listTitle="Everything you need to collect and organize feedback."
      mockup={<BoardMockup />}
      subtitle="Users submit ideas, vote on what matters most, and leave comments. You get a ranked, organized list of exactly what to build next."
      titleHighlight="every feature request."
      titleLead="One place for"
    />
  );
}

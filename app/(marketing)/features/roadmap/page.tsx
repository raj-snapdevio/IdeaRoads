import { ChevronUp } from "lucide-react";
import type { Metadata } from "next";
import { BrowserFrame } from "@/components/marketing/browser-frame";
import { FeatureDetail } from "@/components/marketing/feature-detail";

export const metadata: Metadata = {
  title: "Public Roadmap",
  description:
    "A public roadmap that updates itself. Change a post status and it appears on your roadmap instantly. No Notion doc to maintain.",
};

const ROADMAP_COLUMNS = [
  {
    label: "Planned",
    tone: "text-slate-1",
    cards: [
      { title: "Dark mode support", votes: 67 },
      { title: "Export feedback to CSV", votes: 31 },
      { title: "Two-factor authentication", votes: 24 },
      { title: "Custom email templates", votes: 16 },
    ],
  },
  {
    label: "In Progress",
    tone: "text-brand-700",
    cards: [
      { title: "Custom webhook integrations", votes: 42 },
      { title: "Zapier integration", votes: 18 },
    ],
  },
  {
    label: "Completed",
    tone: "text-[oklch(0.5_0.13_165)]",
    cards: [
      { title: "Board sorting options", votes: 29 },
      { title: "Guest voting via email", votes: 22 },
    ],
  },
];

const BENEFITS = [
  {
    heading: "Always up to date.",
    body: "The roadmap is connected directly to your feedback board statuses. Change a status and the roadmap reflects it immediately — no separate update needed.",
  },
  {
    heading: "Users can follow progress.",
    body: "Your users and stakeholders see exactly what's planned, in progress, and shipped. No more 'what are you working on?' emails.",
  },
  {
    heading: "One source of truth.",
    body: "Your team and your users look at the same roadmap. No version mismatches, no out-of-date Notion pages, no confusion.",
  },
];

const FEATURE_LIST = [
  "Kanban-style roadmap view",
  "Auto-sync with post statuses",
  "Custom status labels",
  "Estimated launch dates",
  "Public shareable roadmap URL",
  "User-facing roadmap portal",
  "Filter by board or category",
  "Follow specific roadmap items",
  "Status change notifications",
  "Custom branding & colors",
  "Embeddable roadmap widget",
];

function RoadmapMockup() {
  return (
    <BrowserFrame url="acme.idearoads.com/roadmap">
      <div className="flex items-center justify-between px-5 py-3.5">
        <span className="mk-display text-sm font-bold text-ink">
          Public Roadmap
        </span>
        <span className="text-xs text-slate-1">Acme Corp</span>
      </div>
      <div className="grid grid-cols-3 gap-3 border-t border-hairline p-4">
        {ROADMAP_COLUMNS.map(({ label, tone, cards }) => (
          <div key={label}>
            <div className="mb-2 flex items-center justify-between">
              <span className={`text-xs font-bold ${tone}`}>{label}</span>
              <span className="text-xs text-slate-2">{cards.length}</span>
            </div>
            <div className="space-y-2">
              {cards.map(({ title, votes }) => (
                <div
                  className="rounded-mk border border-hairline bg-canvas-2/60 p-2.5"
                  key={title}
                >
                  <p className="text-xs font-medium leading-4 text-ink">
                    {title}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1 text-slate-2">
                    <ChevronUp aria-hidden="true" className="size-3" />
                    <span className="text-[0.65rem] font-semibold tabular-nums">
                      {votes}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </BrowserFrame>
  );
}

export default function RoadmapPage() {
  return (
    <FeatureDetail
      benefits={BENEFITS}
      ctaHeading="Give your users a roadmap they can trust."
      ctaSubtitle="No credit card required. Up and running in minutes."
      eyebrow="Public Roadmap"
      features={FEATURE_LIST}
      listTitle="A roadmap your users can follow and your team can trust."
      mockup={<RoadmapMockup />}
      subtitle="Change a post status and it moves on your public roadmap instantly. No Notion doc to maintain. No manual sync between tools."
      titleHighlight="updates itself."
      titleLead="Your roadmap"
    />
  );
}

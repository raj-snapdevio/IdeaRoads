import { Bell, ChevronUp } from "lucide-react";
import type { Metadata } from "next";
import { BrowserFrame } from "@/components/marketing/browser-frame";
import { FeatureDetail } from "@/components/marketing/feature-detail";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Ship with a story. Write a release note, link the posts you shipped, and IdeaRoads automatically notifies every voter.",
};

const BENEFITS = [
  {
    heading: "Close the loop automatically.",
    body: "No manual outreach. Publish a changelog entry and every voter who asked for it gets an email. The feedback loop closes itself.",
  },
  {
    heading: "Build trust with your users.",
    body: "Users who feel heard come back. Showing them you shipped their request — and notifying them directly — turns feedback into loyalty.",
  },
  {
    heading: "Your changelog is a product feature.",
    body: "A public page your users can subscribe to, reference, and share. Every release tells the story of what got built and why.",
  },
];

const FEATURE_LIST = [
  "Release notes with markdown",
  "Link feedback posts to releases",
  "Auto-notify all voters on publish",
  "Public changelog page",
  "Changelog subscribe & RSS feed",
  "Release categories (feature, fix, improvement)",
  "Custom branding & domain",
  "Scheduled publishing",
  "Email preview before sending",
  "Voter notification history",
  "Changelog search",
];

function ChangelogMockup() {
  return (
    <BrowserFrame url="acme.idearoads.com/changelog">
      <div className="flex items-center justify-between px-5 py-3.5">
        <span className="mk-display text-sm font-bold text-ink">Changelog</span>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[0.65rem] font-semibold text-brand-700">
          Latest
        </span>
      </div>
      <div className="border-t border-hairline p-5">
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
          After 67 votes and months of work, dark mode is now available for all
          workspaces. Toggle it in your profile settings — it remembers your
          preference per device.
        </p>

        <div className="mt-5 border-t border-hairline pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-2">
            Delivered from your board
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-mk border border-hairline bg-canvas-2/60 px-3 py-2">
            <ChevronUp aria-hidden="true" className="size-3.5 text-brand-500" />
            <span className="text-xs font-bold text-ink">67</span>
            <span className="text-xs font-medium text-ink">
              Dark mode support
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2.5 rounded-mk-lg border border-brand-200 bg-brand-50/50 px-3.5 py-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-mk bg-brand-500 text-white">
            <Bell aria-hidden="true" className="size-3.5" />
          </span>
          <p className="text-xs text-ink">
            <span className="font-semibold">67 voters notified</span> — email
            sent automatically on publish
          </p>
        </div>
      </div>
    </BrowserFrame>
  );
}

export default function ChangelogPage() {
  return (
    <FeatureDetail
      benefits={BENEFITS}
      ctaHeading="Turn every release into a moment users remember."
      ctaSubtitle="No credit card required. Publish your first changelog in minutes."
      eyebrow="Changelog"
      features={FEATURE_LIST}
      listTitle="Turn every release into a moment users remember."
      mockup={<ChangelogMockup />}
      subtitle="Write a release note, link the posts you shipped, and IdeaRoads emails every voter automatically. No manual outreach. No one left wondering."
      titleHighlight="Every voter hears from you."
      titleLead="Ship with a story."
    />
  );
}

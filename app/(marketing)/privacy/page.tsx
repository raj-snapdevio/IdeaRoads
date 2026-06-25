import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How IdeaRoads collects, uses, and protects your data.",
};

const SECTIONS = [
  {
    heading: "Information We Collect",
    body: "We collect information you provide directly to us when you create an account, submit feedback, or contact support. This includes your name, email address, and any content you submit through our platform.",
  },
  {
    heading: "How We Use Your Information",
    body: "We use the information we collect to operate and improve IdeaRoads, send you product updates and notifications you have opted into, respond to support requests, and ensure platform security.",
  },
  {
    heading: "Data Storage",
    body: "If you are using a self-hosted instance of IdeaRoads, your data is stored on infrastructure you control. For managed instances, data is stored on servers located within your selected region.",
  },
  {
    heading: "Email Notifications",
    body: "Voters who submit or upvote feedback may receive email notifications when the status of a post changes or when a related changelog entry is published. Every notification includes a one-click unsubscribe link.",
  },
  {
    heading: "Third-Party Services",
    body: "IdeaRoads may integrate with third-party services (such as Slack or Zapier) at your direction. We only share data with third parties when you have explicitly configured an integration.",
  },
  {
    heading: "Contact",
    body: "If you have questions about this Privacy Policy or your data, contact us at privacy@idearoads.com.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <section className="relative overflow-hidden bg-canvas">
      <div aria-hidden="true" className="mk-aura absolute inset-0" />
      <div className="relative mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-24">
        <span className="inline-flex items-center rounded-full border border-hairline bg-canvas-2 px-3 py-1 text-xs font-semibold text-slate-1">
          Legal
        </span>
        <h1 className="mk-display mt-5 text-4xl font-extrabold text-ink sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-slate-1">Last updated: June 24, 2026</p>

        <div className="mt-12 divide-y divide-hairline border-t border-hairline">
          {SECTIONS.map(({ heading, body }) => (
            <div className="py-8" key={heading}>
              <h2 className="mk-display text-lg font-bold text-ink">
                {heading}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-1">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-hairline pt-8">
          <Link
            className="text-sm font-semibold text-brand-700 transition-colors duration-150 hover:text-brand-500"
            href="/"
          >
            ← Back to IdeaRoads
          </Link>
        </div>
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of IdeaRoads.",
};

const SECTIONS = [
  {
    heading: "Acceptance of Terms",
    body: "By accessing or using IdeaRoads, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the service.",
  },
  {
    heading: "Use of the Service",
    body: "You may use IdeaRoads only for lawful purposes and in accordance with these terms. You agree not to use the service to submit spam, harass other users, or violate any applicable laws or regulations.",
  },
  {
    heading: "Your Content",
    body: "You retain ownership of any content you submit through IdeaRoads, including feedback posts, comments, and changelog entries. By submitting content, you grant IdeaRoads a license to display that content within the platform.",
  },
  {
    heading: "Accounts",
    body: "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately of any unauthorized use of your account.",
  },
  {
    heading: "Self-Hosted Instances",
    body: "If you deploy a self-hosted instance of IdeaRoads, you are responsible for maintaining that infrastructure, keeping software up to date, and ensuring compliance with applicable laws in your jurisdiction.",
  },
  {
    heading: "Limitation of Liability",
    body: "To the maximum extent permitted by law, IdeaRoads shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.",
  },
  {
    heading: "Changes to Terms",
    body: "We may update these terms from time to time. Continued use of IdeaRoads after changes are posted constitutes acceptance of the updated terms.",
  },
  {
    heading: "Contact",
    body: "Questions about these terms? Contact us at legal@idearoads.com.",
  },
] as const;

export default function TermsPage() {
  return (
    <section className="relative overflow-hidden bg-canvas">
      <div aria-hidden="true" className="mk-aura absolute inset-0" />
      <div className="relative mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-24">
        <span className="inline-flex items-center rounded-full border border-hairline bg-canvas-2 px-3 py-1 text-xs font-semibold text-slate-1">
          Legal
        </span>
        <h1 className="mk-display mt-5 text-4xl font-extrabold text-ink sm:text-5xl">
          Terms of Service
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

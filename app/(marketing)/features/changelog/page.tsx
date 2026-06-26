import { ChevronUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
] as const;

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
] as const;

function ChangelogMockup() {
  return (
    <div aria-hidden="true" className="border border-border bg-card">
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b border-border bg-muted px-4 py-2.5">
        <div className="flex shrink-0 gap-1.5">
          <span className="block size-2 bg-border" />
          <span className="block size-2 bg-border" />
          <span className="block size-2 bg-border" />
        </div>
        <div className="min-w-0 flex-1 border border-border bg-background px-3 py-0.5 text-center">
          <span className="font-mono text-2xs text-muted-foreground">
            acme.idearoads.com/changelog
          </span>
        </div>
      </div>

      {/* Changelog header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold text-foreground">Changelog</span>
        <span className="text-2xs font-semibold uppercase tracking-ui text-success">
          Latest
        </span>
      </div>

      {/* Entry */}
      <div className="p-5">
        <div className="flex items-center gap-2">
          <span className="border border-border px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-ui text-success">
            Feature
          </span>
          <span className="text-2xs font-semibold uppercase tracking-ui text-muted-foreground">
            Jun 24, 2026
          </span>
        </div>
        <h4 className="mt-3 font-bold text-base text-foreground">
          Dark mode is here
        </h4>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          After 67 votes and months of work, dark mode is now available for all
          workspaces. Toggle it in your profile settings — it remembers your
          preference per device.
        </p>

        {/* Linked posts */}
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-2xs font-semibold uppercase tracking-ui text-muted-foreground">
            Delivered from your board
          </p>
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2 border border-border bg-muted px-3 py-2">
              <ChevronUp
                aria-hidden="true"
                className="size-3.5 text-muted-foreground"
              />
              <span className="font-mono text-2xs font-semibold text-muted-foreground">
                67
              </span>
              <span className="text-xs font-medium text-foreground">
                Dark mode support
              </span>
            </div>
          </div>
        </div>

        {/* Notification notice */}
        <div className="mt-4 border border-border bg-muted px-3 py-2.5">
          <p className="text-2xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              67 voters notified
            </span>{" "}
            — email sent automatically on publish
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ChangelogPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <p className="font-bold text-xs uppercase tracking-eyebrow text-success">
            Changelog
          </p>
          <h1 className="mt-4 font-black text-5xl tracking-normal text-foreground sm:text-6xl">
            Ship with a story.
            <br className="hidden sm:block" /> Every voter hears from you.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Write a release note, link the posts you shipped, and IdeaRoads
            emails every voter automatically. No manual outreach. No one left
            wondering.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/login">Start Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/demo">View Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 3 benefit pillars */}
      <section className="border-y border-border bg-muted">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <div className="grid gap-px bg-border sm:grid-cols-3">
            {BENEFITS.map(({ heading, body }) => (
              <div className="bg-muted p-8" key={heading}>
                <h3 className="font-bold text-base text-foreground">
                  {heading}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mockup + feature list */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[7fr_5fr] lg:items-start lg:gap-16">
            <ChangelogMockup />
            <div>
              <p className="font-bold text-xs uppercase tracking-eyebrow text-muted-foreground">
                What&apos;s Included
              </p>
              <h2 className="mt-4 font-bold text-2xl text-foreground">
                Turn every release into a moment users remember.
              </h2>
              <ul className="mt-8 space-y-2.5">
                {FEATURE_LIST.map((item) => (
                  <li
                    className="flex items-start gap-2.5 text-sm text-foreground"
                    key={item}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 font-mono text-success"
                    >
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted">
        <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-8">
          <h2 className="font-black text-3xl text-foreground sm:text-4xl">
            Turn every release into a moment users remember.
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            No credit card required. Publish your first changelog in minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/login">Start Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/features">See All Features →</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

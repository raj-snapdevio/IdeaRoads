import {
  ArrowUp,
  BarChart3,
  Bell,
  BookOpen,
  LayoutGrid,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: LayoutGrid,
    title: "Feedback Boards",
    description:
      "Users submit requests directly — no more ideas buried in your inbox or scattered across Slack and Notion.",
  },
  {
    icon: ArrowUp,
    title: "Voting",
    description:
      "Know exactly which problems are blocking the most users, ranked by real signal — not by who emailed you last.",
  },
  {
    icon: BarChart3,
    title: "Public Roadmap",
    description:
      "Your roadmap updates automatically as you change post statuses. No separate Notion page to maintain.",
  },
  {
    icon: BookOpen,
    title: "Changelog",
    description:
      "Every user who requested a feature gets an email the day you ship it. The loop closes automatically.",
  },
  {
    icon: Users,
    title: "Team Roles",
    description:
      "Your whole team can triage feedback without sharing admin credentials. Invite by email or shareable link.",
  },
  {
    icon: Bell,
    title: "Email Notifications",
    description:
      "Users stay informed at every step — status changes, comments, and changelog updates. One-click unsubscribe.",
  },
] as const;

export function FeaturesGrid() {
  return (
    <section className="bg-muted" id="features">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
        <p className="font-bold text-xs uppercase tracking-eyebrow text-success">
          What You Get
        </p>

        <h2 className="mt-4 font-bold text-3xl text-foreground sm:text-4xl">
          Everything a product team needs. Nothing they don't.
        </h2>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div className="border border-border bg-card p-6" key={title}>
              <Icon aria-hidden="true" className="size-5 text-foreground" />
              <h3 className="mt-3 font-semibold text-base text-foreground">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Button asChild>
            <Link href="/signin">Start Free</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";

const BOARDS = [
  { name: "Feature Requests", posts: 48, activity: "Updated 2h ago" },
  { name: "Bug Reports", posts: 12, activity: "Updated 1d ago" },
  { name: "Design Feedback", posts: 7, activity: "Updated 3d ago" },
] as const;

function WorkspaceMockup() {
  return (
    <div aria-hidden="true" className="border border-border bg-card">
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b border-border bg-muted px-4 py-3">
        <div className="flex shrink-0 gap-1.5">
          <span className="block size-2.5 bg-border" />
          <span className="block size-2.5 bg-border" />
          <span className="block size-2.5 bg-border" />
        </div>
        <div className="min-w-0 flex-1 border border-border bg-background px-3 py-1 text-center">
          <span className="font-mono text-2xs text-muted-foreground">
            app.idearoads.com/workspace
          </span>
        </div>
      </div>

      {/* Workspace header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-ui text-muted-foreground">
            Workspace
          </p>
          <p className="text-sm font-semibold text-foreground">Acme Corp</p>
        </div>
        <span className="text-2xs font-semibold uppercase tracking-ui text-muted-foreground">
          Team · Settings
        </span>
      </div>

      {/* Boards list header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold text-foreground">Boards</span>
        <span className="border border-border px-2 py-0.5 text-2xs font-semibold uppercase tracking-ui text-foreground">
          + New Board
        </span>
      </div>

      {/* Board rows */}
      <div className="divide-y divide-border">
        {BOARDS.map(({ name, posts, activity }) => (
          <div
            className="flex items-center justify-between px-4 py-3.5"
            key={name}
          >
            <div>
              <p className="text-sm font-medium text-foreground">{name}</p>
              <p className="mt-0.5 text-2xs text-muted-foreground">
                {posts} posts · {activity}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                {posts}
              </span>
              <span className="text-sm text-muted-foreground">→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LiveDemo() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-16">
          <div>
            <p className="font-bold text-xs uppercase tracking-eyebrow text-success">
              See It Live
            </p>

            <h2 className="mt-4 font-bold text-3xl text-foreground sm:text-4xl">
              See it before you commit.
            </h2>

            <p className="mt-3 text-lg text-muted-foreground">
              Your team gets a workspace dashboard to manage boards, triage
              posts, and track everything in one place — while users see a
              clean, branded feedback portal.
            </p>

            <div className="mt-8">
              <Button asChild size="lg">
                <Link href="/signin">Start Free</Link>
              </Button>
            </div>
          </div>

          <div className="hidden lg:block">
            <WorkspaceMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

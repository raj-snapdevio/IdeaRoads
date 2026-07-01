import { format } from "date-fns";
import { Rss } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChangelogLabelBadge } from "@/components/changelog/changelog-label-badge";
import { getCurrentSession } from "@/lib/authz";
import { truncateMarkdownToText } from "@/lib/changelog/markdown";
import { listChangelogEntries } from "@/lib/changelog/queries";
import { env } from "@/lib/env";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return { title: "Changelog" };
  }
  const title = `Changelog — ${workspace.name}`;
  return {
    title,
    openGraph: {
      title,
      url: `${env.NEXT_PUBLIC_APP_URL}/${slug}/changelog`,
      type: "website",
    },
    robots: workspace.changelogPublic ? "index, follow" : "noindex, nofollow",
  };
}

export default async function PublicChangelogIndexPage({ params }: Props) {
  const { slug } = await params;

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const session = await getCurrentSession();
  const member = session
    ? await getWorkspaceMember(workspace.id, session.user.id)
    : null;

  // A private changelog is visible only to workspace members.
  if (!workspace.changelogPublic && !member) {
    notFound();
  }

  const { entries } = await listChangelogEntries(workspace.id, {
    includeDrafts: false,
    limit: 50,
  });

  const isSignedIn = !!session;

  return (
    <div className="min-h-screen bg-background">
      {/* Public nav — visitors only; members get the workspace sidebar */}
      {!member && (
        <header className="border-b border-border bg-background sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link
                className="text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
                href={`/${slug}`}
              >
                {workspace.name}
              </Link>
              <nav className="hidden sm:flex items-center gap-1">
                {workspace.roadmapPublic && (
                  <Link
                    className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    href={`/${slug}/roadmap`}
                  >
                    Roadmap
                  </Link>
                )}
                <Link
                  className="px-3 py-1.5 text-sm font-medium text-foreground border-b-2 border-foreground"
                  href={`/${slug}/changelog`}
                >
                  Changelog
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <Link
                aria-label="RSS feed"
                className="text-muted-foreground hover:text-foreground transition-colors"
                href={`/${slug}/changelog/feed.xml`}
              >
                <Rss className="size-4" />
              </Link>
              {isSignedIn ? (
                <Link
                  className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  href={`/${slug}`}
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  href="/signin"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 pt-10 pb-20">
        <h1 className="text-2xl font-bold text-foreground">Changelog</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The latest updates and improvements to {workspace.name}.
        </p>

        {entries.length === 0 ? (
          <div className="mt-12 border border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No updates published yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="mt-8 divide-y divide-border border-t border-border">
            {entries.map((entry) => (
              <article className="py-8" key={entry.id}>
                <div className="flex items-center gap-3">
                  <ChangelogLabelBadge label={entry.label} />
                  {entry.publishedAt && (
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={new Date(entry.publishedAt).toISOString()}
                    >
                      {format(new Date(entry.publishedAt), "MMMM d, yyyy")}
                    </time>
                  )}
                </div>
                <h2 className="mt-3 text-lg font-semibold text-foreground">
                  <Link
                    className="hover:text-foreground/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href={`/${slug}/changelog/${entry.id}`}
                  >
                    {entry.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {truncateMarkdownToText(entry.body, 240)}
                </p>
                <Link
                  className="mt-3 inline-block text-sm font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={`/${slug}/changelog/${entry.id}`}
                >
                  Read more →
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

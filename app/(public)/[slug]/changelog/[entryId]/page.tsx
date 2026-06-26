import { format } from "date-fns";
import { ArrowLeft, Rss } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChangelogLabelBadge } from "@/components/changelog/changelog-label-badge";
import { getCurrentSession } from "@/lib/authz";
import { renderMarkdown } from "@/lib/changelog/markdown";
import { getChangelogEntryById } from "@/lib/changelog/queries";
import { env } from "@/lib/env";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";

interface Props {
  params: Promise<{ slug: string; entryId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, entryId } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return { title: "Changelog" };
  }

  const entry = await getChangelogEntryById(entryId, workspace.id);
  if (!entry || !entry.isPublished) {
    return { title: "Changelog", robots: "noindex" };
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const title = `${entry.title} — ${workspace.name} Changelog`;

  return {
    title,
    openGraph: {
      title,
      url: `${appUrl}/${slug}/changelog/${entryId}`,
      type: "article",
    },
    robots: workspace.changelogPublic ? "index, follow" : "noindex, nofollow",
  };
}

export default async function PublicChangelogEntryPage({ params }: Props) {
  const { slug, entryId } = await params;

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const session = await getCurrentSession();
  const member = session
    ? await getWorkspaceMember(workspace.id, session.user.id)
    : null;

  if (!workspace.changelogPublic && !member) {
    notFound();
  }

  const entry = await getChangelogEntryById(entryId, workspace.id);
  if (!entry || !entry.isPublished) {
    notFound();
  }

  const isSignedIn = !!session;
  const renderedBody = renderMarkdown(entry.body);

  return (
    <div className="min-h-screen bg-background">
      {/* Public nav */}
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
                href="/login"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 pt-10 pb-20">
        {/* Back link */}
        <Link
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8"
          href={`/${slug}/changelog`}
        >
          <ArrowLeft className="size-3.5" />
          All updates
        </Link>

        {/* Entry header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <ChangelogLabelBadge label={entry.label} size="md" />
            {entry.publishedAt && (
              <time
                className="text-sm text-muted-foreground"
                dateTime={entry.publishedAt.toISOString()}
              >
                {format(entry.publishedAt, "MMMM d, yyyy")}
              </time>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight leading-snug">
            {entry.title}
          </h1>
        </div>

        {/* Rendered body */}
        <div
          className="prose prose-sm max-w-none text-foreground prose-headings:font-semibold prose-a:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-pre:bg-muted"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: server-side sanitized via DOMPurify
          dangerouslySetInnerHTML={{ __html: renderedBody }}
        />

        {/* Linked posts */}
        {entry.linkedPosts.length > 0 && (
          <div className="mt-12 pt-8 border-t border-border">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Related Feedback
            </h2>
            <div className="space-y-2">
              {entry.linkedPosts.map((post) => (
                <Link
                  className="flex items-center justify-between gap-4 px-4 py-3 border border-border hover:bg-muted/40 transition-colors group"
                  href={`/${slug}/b/${post.boardSlug}/p/${post.slug}`}
                  key={post.id}
                >
                  <span className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors">
                    {post.title}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      ↑ {post.upvotes}
                    </span>
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5"
                      style={{
                        borderRadius: 2,
                        backgroundColor: "#6b728018",
                        color: "#6b7280",
                      }}
                    >
                      {post.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

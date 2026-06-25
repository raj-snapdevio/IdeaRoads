import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Rss } from "lucide-react";
import { notFound } from "next/navigation";
import { ChangelogAdminCard } from "@/components/changelog/changelog-admin-card";
import { ChangelogEntryCard } from "@/components/changelog/changelog-entry-card";
import { getCurrentSession } from "@/lib/authz";
import { env } from "@/lib/env";
import { listChangelogEntries } from "@/lib/changelog/queries";
import { WORKSPACE_MEMBER } from "@/config/platform";
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

  if (!workspace || !workspace.changelogPublic) {
    return { title: "Changelog", robots: "noindex, nofollow" };
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const title = `${workspace.name} Changelog`;
  const description = `Product updates, new features, and improvements from ${workspace.name}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${appUrl}/${slug}/changelog`,
      type: "website",
    },
    robots: "index, follow",
  };
}

export default async function PublicChangelogPage({ params }: Props) {
  const { slug } = await params;

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const session = await getCurrentSession();
  const member = session
    ? await getWorkspaceMember(workspace.id, session.user.id)
    : null;

  if (!workspace.changelogPublic && !member) notFound();

  const isAdmin = member ? member.role !== WORKSPACE_MEMBER : false;
  const isSignedIn = !!session;

  const { entries, total } = await listChangelogEntries(workspace.id, {
    includeDrafts: isAdmin,
    limit: 50,
  });

  const drafts = isAdmin ? entries.filter((e) => !e.isPublished) : [];
  const published = entries.filter((e) => e.isPublished);

  return (
    <div className="min-h-screen bg-background">
      {/* Public nav */}
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link
              href={`/${slug}`}
              className="text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
            >
              {workspace.name}
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {workspace.roadmapPublic && (
                <Link
                  href={`/${slug}/roadmap`}
                  className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Roadmap
                </Link>
              )}
              <Link
                href={`/${slug}/changelog`}
                className="px-3 py-1.5 text-sm font-medium text-foreground border-b-2 border-foreground"
              >
                Changelog
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/${slug}/changelog/feed.xml`}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="RSS feed"
            >
              <Rss className="size-4" />
            </Link>
            {!isSignedIn ? (
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
            ) : (
              <Link
                href={`/${slug}`}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Admin banner */}
      {isAdmin && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-3xl mx-auto px-6 py-2 flex items-center justify-between gap-4">
            <p className="text-xs font-medium text-amber-800">
              Admin view — drafts visible only to you
            </p>
            <Link
              href={`/${slug}/changelog/new`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-3" />
              New Entry
            </Link>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="max-w-3xl mx-auto px-6 pt-10 pb-2">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {workspace.name} Changelog
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {published.length === 0 && drafts.length === 0
            ? "No updates published yet."
            : isAdmin
              ? `${published.length} published · ${drafts.length} draft${drafts.length !== 1 ? "s" : ""}`
              : `${total} update${total !== 1 ? "s" : ""} published`}
        </p>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 pb-16">
        {/* Drafts (admin only) */}
        {isAdmin && drafts.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Drafts ({drafts.length})
            </h2>
            <div className="space-y-3">
              {drafts.map((entry) => (
                <ChangelogAdminCard
                  key={entry.id}
                  entry={entry}
                  workspaceId={workspace.id}
                  workspaceSlug={slug}
                />
              ))}
            </div>
          </div>
        )}

        {/* Published entries */}
        {published.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm font-medium text-foreground">
              Nothing here yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Check back soon for product updates and announcements.
            </p>
            {isAdmin && (
              <Link
                href={`/${slug}/changelog/new`}
                className="mt-4 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Create your first entry
              </Link>
            )}
          </div>
        ) : (
          <div className={isAdmin && drafts.length > 0 ? "mt-8" : ""}>
            {isAdmin && drafts.length > 0 && (
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Published ({published.length})
              </h2>
            )}
            {isAdmin ? (
              <div className="space-y-3">
                {published.map((entry) => (
                  <ChangelogAdminCard
                    key={entry.id}
                    entry={entry}
                    workspaceId={workspace.id}
                    workspaceSlug={slug}
                  />
                ))}
              </div>
            ) : (
              <div>
                {published.map((entry) => (
                  <ChangelogEntryCard
                    key={entry.id}
                    entry={entry}
                    workspaceSlug={slug}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

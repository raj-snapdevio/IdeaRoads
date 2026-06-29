import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChangelogAdminCard } from "@/components/changelog/changelog-admin-card";
import { ChangelogEntryCard } from "@/components/changelog/changelog-entry-card";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import { listChangelogEntries } from "@/lib/changelog/queries";
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
  return { title: workspace ? `Changelog — ${workspace.name}` : "Changelog" };
}

export default async function WorkspaceChangelogPage({ params }: Props) {
  const { slug } = await params;

  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) notFound();

  const isAdmin = member.role !== WORKSPACE_MEMBER;

  const { entries, total } = await listChangelogEntries(workspace.id, {
    includeDrafts: isAdmin,
    limit: 50,
  });

  const drafts = isAdmin ? entries.filter((e) => !e.isPublished) : [];
  const published = entries.filter((e) => e.isPublished);

  return (
    <div className="flex flex-col">
      {/* Page header */}
      <div className="border-b border-border px-8 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground">Changelog</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {published.length === 0 && drafts.length === 0
                ? "No updates published yet."
                : isAdmin
                  ? `${published.length} published · ${drafts.length} draft${drafts.length === 1 ? "" : "s"}`
                  : `${total} update${total === 1 ? "" : "s"} published`}
            </p>
          </div>
          {isAdmin && (
            <Link
              className="flex shrink-0 items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/${slug}/changelog/new`}
            >
              <Plus className="size-4" />
              New entry
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {/* Drafts (admin only) */}
        {isAdmin && drafts.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Drafts ({drafts.length})
            </h2>
            <div className="space-y-3">
              {drafts.map((entry) => (
                <ChangelogAdminCard
                  entry={entry}
                  key={entry.id}
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
                className="mt-4 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                href={`/${slug}/changelog/new`}
              >
                Create your first entry
              </Link>
            )}
          </div>
        ) : (
          <div>
            {isAdmin && drafts.length > 0 && (
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Published ({published.length})
              </h2>
            )}
            {isAdmin ? (
              <div className="space-y-3">
                {published.map((entry) => (
                  <ChangelogAdminCard
                    entry={entry}
                    key={entry.id}
                    workspaceId={workspace.id}
                    workspaceSlug={slug}
                  />
                ))}
              </div>
            ) : (
              <div>
                {published.map((entry) => (
                  <ChangelogEntryCard
                    entry={entry}
                    key={entry.id}
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

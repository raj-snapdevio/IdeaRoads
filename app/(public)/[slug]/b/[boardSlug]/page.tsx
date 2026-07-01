import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Pin, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryChip } from "@/components/categories/category-chip";
import VoteButton from "@/components/voting/vote-button";
import { PortalHeader } from "@/components/workspace/portal-header";
import { getCurrentSession } from "@/lib/authz";
import { getBoardBySlug } from "@/lib/boards/queries";
import { getActiveCategoriesForWorkspace } from "@/lib/categories/queries";
import { listBoardPosts } from "@/lib/posts/queries";
import { getActiveWorkspaceStatuses } from "@/lib/workspace-statuses/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import BoardFilters from "./_components/board-filters";
import { PostStatusBadge } from "./_components/post-status-badge";

interface Props {
  params: Promise<{ slug: string; boardSlug: string }>;
  searchParams: Promise<{
    sort?: string;
    status?: string;
    category?: string;
    q?: string;
    myVotes?: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, boardSlug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return { title: "Board" };
  }
  const board = await getBoardBySlug(workspace.id, boardSlug);
  return { title: board?.name ?? "Board" };
}

export default async function BoardPage({ params, searchParams }: Props) {
  const { slug, boardSlug } = await params;
  const { sort, status, category, q, myVotes } = await searchParams;

  const session = await getCurrentSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    notFound();
  }

  const member = session
    ? await getWorkspaceMember(workspace.id, session.user.id)
    : null;
  const isSignedIn = !!session;
  const isMember = !!member;

  const board = await getBoardBySlug(workspace.id, boardSlug);
  if (!board) {
    notFound();
  }

  // Private boards are visible to workspace members only. Archived boards stay
  // publicly readable (read-only) — they show a notice and don't accept new
  // feedback (see below).
  if (!board.isPublic && !isMember) {
    notFound();
  }

  const validSort =
    sort === "top" ? "top" : sort === "trending" ? "trending" : "newest";
  const validStatus = status ?? "";
  const validCategoryId = category ?? "";
  const searchQuery = q ?? "";
  const myVotesActive = isSignedIn && myVotes === "true";

  const [boardPosts, workspaceStatuses, categories] = await Promise.all([
    listBoardPosts(board.id, {
      sort: validSort,
      status: validStatus || undefined,
      categoryId: validCategoryId || undefined,
      search: searchQuery || undefined,
      userId: session?.user.id,
      myVotes: myVotesActive,
      // Team (Brand Admin + Team Member) sees moderation-held posts; the public
      // sees approved feedback only.
      includeUnapproved: isMember,
    }),
    getActiveWorkspaceStatuses(workspace.id),
    getActiveCategoriesForWorkspace(workspace.id),
  ]);

  // Build a category map for quick lookup
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const newPostHref = isSignedIn
    ? `/${slug}/b/${boardSlug}/new`
    : `/signin?next=${encodeURIComponent(`/${slug}/b/${boardSlug}/new`)}`;

  return (
    <div className="min-h-screen bg-background">
      {!isMember && (
        <PortalHeader
          changelogPublic={workspace.changelogPublic}
          isSignedIn={isSignedIn}
          roadmapPublic={workspace.roadmapPublic}
          slug={slug}
          workspaceName={workspace.name}
        />
      )}

      <div className="max-w-5xl mx-auto flex flex-col">
        {/* Page header */}
        <div className="border-b border-border px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground">
                {board.name}
              </h1>
              {board.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {board.description}
                </p>
              )}
            </div>
            {!board.isArchived && (
              <Link
                className="flex shrink-0 items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={newPostHref}
              >
                <Plus className="size-4" />
                New post
              </Link>
            )}
          </div>
          {board.isArchived && (
            <p className="mt-3 text-xs text-muted-foreground border-l-2 border-border pl-3">
              This board is archived and no longer accepting new feedback. Its
              posts remain readable below.
            </p>
          )}
        </div>

        {/* Filters */}
        <BoardFilters
          activeCategoryId={validCategoryId}
          activeSearch={searchQuery}
          activeSort={validSort}
          activeStatus={validStatus}
          categories={categories}
          myVotesActive={myVotesActive}
          showMyVotes={isSignedIn}
          workspaceStatuses={workspaceStatuses}
        />

        {/* Post list */}
        <div className="flex-1">
          {boardPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-8">
              {searchQuery ||
              validStatus ||
              validCategoryId ||
              myVotesActive ? (
                <>
                  <p className="text-sm font-medium text-foreground">
                    No posts match your filters
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try a different search term, status, or category.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">
                    No feedback yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Be the first to submit an idea or request.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {boardPosts.map((post) => {
                const postCategory = post.categoryId
                  ? categoryMap.get(post.categoryId)
                  : undefined;

                return (
                  <div
                    className="group flex items-start gap-4 px-8 py-5 hover:bg-muted/40 transition-colors duration-150"
                    key={post.id}
                  >
                    {/* Vote button */}
                    <div className="shrink-0">
                      <VoteButton
                        initialCount={post.upvotes}
                        initialHasVoted={post.hasVoted}
                        isArchived={board.isArchived}
                        isLocked={false}
                        isSignedIn={isSignedIn}
                        postId={post.id}
                      />
                    </div>

                    {/* Post content */}
                    <Link
                      className="flex-1 min-w-0 pt-1"
                      href={`/${slug}/b/${boardSlug}/p/${post.slug}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {post.isPinned && (
                          <Pin className="size-3 text-muted-foreground shrink-0" />
                        )}
                        <p className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors">
                          {post.title}
                        </p>
                        {post.status !== "open" && (
                          <PostStatusBadge
                            status={post.status}
                            workspaceStatuses={workspaceStatuses}
                          />
                        )}
                        {postCategory && (
                          <CategoryChip
                            color={postCategory.color}
                            name={postCategory.name}
                            size="xs"
                          />
                        )}
                      </div>
                      {post.body && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {post.body}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          {post.authorName ?? post.authorEmail} ·{" "}
                          {formatDistanceToNow(post.createdAt, {
                            addSuffix: true,
                          })}
                        </span>
                        {post.commentCount > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="size-3" />
                            {post.commentCount}
                          </span>
                        )}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

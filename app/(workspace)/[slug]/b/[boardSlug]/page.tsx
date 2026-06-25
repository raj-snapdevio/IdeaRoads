import { formatDistanceToNow } from "date-fns";
import { ChevronUp, Pin, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { getBoardBySlug } from "@/lib/boards/queries";
import { listBoardPosts } from "@/lib/posts/queries";
import { getBatchUserVotes } from "@/lib/posts/votes";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import BoardFilters from "./_components/board-filters";
import { PostStatusBadge } from "./_components/post-status-badge";

interface Props {
  params: Promise<{ slug: string; boardSlug: string }>;
  searchParams: Promise<{ sort?: string; status?: string; q?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, boardSlug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) return { title: "Board" };
  const board = await getBoardBySlug(workspace.id, boardSlug);
  return { title: board?.name ?? "Board" };
}

export default async function BoardPage({ params, searchParams }: Props) {
  const { slug, boardSlug } = await params;
  const { sort, status, q } = await searchParams;

  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) notFound();

  const board = await getBoardBySlug(workspace.id, boardSlug);
  if (!board) notFound();

  const validSort = sort === "top" ? "top" : "newest";
  const validStatus = status ?? "";
  const searchQuery = q ?? "";

  const boardPosts = await listBoardPosts(board.id, {
    sort: validSort,
    status: validStatus || undefined,
    search: searchQuery || undefined,
  });

  const votedSet = await getBatchUserVotes(
    boardPosts.map((p) => p.id),
    session.user.id
  );

  return (
    <div className="flex flex-col">
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
          <Link
            href={`/${slug}/b/${boardSlug}/new`}
            className="flex shrink-0 items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" />
            New post
          </Link>
        </div>
      </div>

      {/* Filters */}
      <BoardFilters
        activeSort={validSort}
        activeStatus={validStatus}
        activeSearch={searchQuery}
      />

      {/* Post list */}
      <div className="flex-1">
        {boardPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-8">
            {searchQuery || validStatus ? (
              <>
                <p className="text-sm font-medium text-foreground">
                  No posts match your filters
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try a different search term or status.
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
              const hasVoted = votedSet.has(post.id);
              return (
                <Link
                  key={post.id}
                  href={`/${slug}/b/${boardSlug}/p/${post.slug}`}
                  className="group flex items-start gap-4 px-8 py-5 hover:bg-muted/40 transition-colors duration-150"
                >
                  {/* Vote pill */}
                  <div
                    className={`flex shrink-0 flex-col items-center gap-0.5 border px-2.5 py-2 transition-colors duration-150 ${
                      hasVoted
                        ? "border-primary/30 bg-primary/5 text-primary"
                        : "border-border text-muted-foreground group-hover:border-muted-foreground/40"
                    }`}
                  >
                    <ChevronUp className="size-3.5" />
                    <span className="text-xs font-semibold tabular-nums">
                      {post.upvotes}
                    </span>
                  </div>

                  {/* Post content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {post.isPinned && (
                        <Pin className="size-3 text-muted-foreground shrink-0" />
                      )}
                      <p className="text-sm font-medium text-foreground">
                        {post.title}
                      </p>
                      {post.status !== "open" && (
                        <PostStatusBadge status={post.status} />
                      )}
                    </div>
                    {post.body && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {post.body}
                      </p>
                    )}
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {post.authorName ?? post.authorEmail} ·{" "}
                      {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

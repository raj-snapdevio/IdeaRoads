import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Pin, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import VoteButton from "@/components/voting/vote-button";
import { requireSession } from "@/lib/authz";
import { getBoardBySlug } from "@/lib/boards/queries";
import { listBoardPosts } from "@/lib/posts/queries";
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
    q?: string;
    myVotes?: string;
  }>;
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
  const { sort, status, q, myVotes } = await searchParams;

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
  const myVotesActive = myVotes === "true";

  const boardPosts = await listBoardPosts(board.id, {
    sort: validSort,
    status: validStatus || undefined,
    search: searchQuery || undefined,
    userId: session.user.id,
    myVotes: myVotesActive,
  });

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
        myVotesActive={myVotesActive}
        showMyVotes={true}
      />

      {/* Post list */}
      <div className="flex-1">
        {boardPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-8">
            {searchQuery || validStatus || myVotesActive ? (
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
            {boardPosts.map((post) => (
              <div
                key={post.id}
                className="group flex items-start gap-4 px-8 py-5 hover:bg-muted/40 transition-colors duration-150"
              >
                {/* Vote button (non-interactive on list — links navigate) */}
                <div className="shrink-0">
                  <VoteButton
                    postId={post.id}
                    initialCount={post.upvotes}
                    initialHasVoted={post.hasVoted}
                    isSignedIn={true}
                    isLocked={false}
                    isArchived={board.isArchived}
                  />
                </div>

                {/* Post content — navigates to post detail */}
                <Link
                  href={`/${slug}/b/${boardSlug}/p/${post.slug}`}
                  className="flex-1 min-w-0 pt-1"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {post.isPinned && (
                      <Pin className="size-3 text-muted-foreground shrink-0" />
                    )}
                    <p className="text-sm font-medium text-foreground group-hover:text-foreground/80 transition-colors">
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
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {post.authorName ?? post.authorEmail} ·{" "}
                      {formatDistanceToNow(post.createdAt, { addSuffix: true })}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

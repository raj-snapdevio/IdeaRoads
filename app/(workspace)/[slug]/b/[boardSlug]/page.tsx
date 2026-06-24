import { formatDistanceToNow } from "date-fns";
import { ChevronUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { getBoardBySlug } from "@/lib/boards/queries";
import { listBoardPosts } from "@/lib/posts/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import NewPostForm from "./_components/new-post-form";
import { PostStatusBadge } from "./_components/post-status-badge";
import SortTabs from "./_components/sort-tabs";

interface Props {
  params: Promise<{ slug: string; boardSlug: string }>;
  searchParams: Promise<{ sort?: string }>;
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
  const { sort } = await searchParams;

  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) notFound();

  const board = await getBoardBySlug(workspace.id, boardSlug);
  if (!board) notFound();

  const validSort = sort === "top" ? "top" : "newest";
  const boardPosts = await listBoardPosts(board.id, validSort);

  return (
    <div className="flex flex-col">
      {/* Page header */}
      <div className="border-b border-border px-8 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
          <div className="shrink-0">
            <NewPostForm
              boardId={board.id}
              workspaceId={workspace.id}
              boardSlug={boardSlug}
              workspaceSlug={slug}
            />
          </div>
        </div>
      </div>

      {/* Sort tabs */}
      <div className="border-b border-border px-4">
        <SortTabs activeSort={validSort} />
      </div>

      {/* Post list */}
      <div className="flex-1">
        {boardPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-8">
            <p className="text-sm font-medium text-foreground">
              No feedback yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Be the first to submit an idea or request.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {boardPosts.map((post) => (
              <Link
                key={post.id}
                href={`/${slug}/b/${boardSlug}/p/${post.id}`}
                className="group flex items-start gap-4 px-8 py-5 hover:bg-muted/40 transition-colors duration-150"
              >
                {/* Vote count */}
                <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
                  <ChevronUp className="size-4 text-muted-foreground group-hover:text-foreground transition-colors duration-150" />
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground group-hover:text-foreground transition-colors duration-150">
                    {post.upvotes}
                  </span>
                </div>

                {/* Post content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

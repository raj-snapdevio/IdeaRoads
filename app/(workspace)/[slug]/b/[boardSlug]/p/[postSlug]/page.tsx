import { format } from "date-fns";
import { ArrowLeft, MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { requireSession } from "@/lib/authz";
import { getBoardBySlug } from "@/lib/boards/queries";
import { listPostComments } from "@/lib/posts/comments";
import { getPostBySlug } from "@/lib/posts/queries";
import { getUserVote } from "@/lib/posts/votes";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import CommentForm from "./_components/comment-form";
import CommentList from "./_components/comment-list";
import DeletePostButton from "./_components/delete-post-button";
import PinButton from "./_components/pin-button";
import StatusSelect from "./_components/status-select";
import VoteButton from "./_components/vote-button";

interface Props {
  params: Promise<{ slug: string; boardSlug: string; postSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, boardSlug, postSlug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) return { title: "Post" };
  const board = await getBoardBySlug(workspace.id, boardSlug);
  if (!board) return { title: "Post" };
  const post = await getPostBySlug(board.id, postSlug);
  return { title: post?.title ?? "Post" };
}

export default async function PostDetailPage({ params }: Props) {
  const { slug, boardSlug, postSlug } = await params;

  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) notFound();

  const board = await getBoardBySlug(workspace.id, boardSlug);
  if (!board) notFound();

  const post = await getPostBySlug(board.id, postSlug);
  if (!post) notFound();

  const isAdminOrOwner = member.role !== WORKSPACE_MEMBER;
  const isAuthor = post.authorId === session.user.id;

  const [hasVoted, comments] = await Promise.all([
    getUserVote(post.id, session.user.id),
    listPostComments(post.id),
  ]);

  const boardHref = `/${slug}/b/${boardSlug}`;

  return (
    <div className="flex flex-col">
      {/* Back nav */}
      <div className="border-b border-border px-8 py-4">
        <Link
          href={boardHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          {board.name}
        </Link>
      </div>

      <div className="px-8 py-8 max-w-3xl">
        {/* Post header */}
        <div className="flex items-start gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-foreground leading-snug">
              {post.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <StatusSelect
                postId={post.id}
                workspaceId={workspace.id}
                currentStatus={post.status}
                canEdit={isAdminOrOwner}
              />
              <span className="text-xs text-muted-foreground">
                by {post.authorName ?? post.authorEmail}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(post.createdAt, "MMM d, yyyy")}
              </span>
              {post.updatedAt > post.createdAt && (
                <span className="text-xs text-muted-foreground/60">
                  edited {format(post.updatedAt, "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>

          {/* Vote button */}
          <div className="shrink-0">
            <VoteButton
              postId={post.id}
              workspaceId={workspace.id}
              initialUpvotes={post.upvotes}
              initialVoted={hasVoted}
            />
          </div>
        </div>

        {/* Post body */}
        {post.body && (
          <div className="mt-6 border-t border-border pt-6">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {post.body}
            </p>
          </div>
        )}

        {/* Admin actions */}
        {(isAdminOrOwner || isAuthor) && (
          <div className="mt-6 flex items-center gap-4 border-t border-border pt-4">
            {isAdminOrOwner && (
              <PinButton
                postId={post.id}
                workspaceId={workspace.id}
                isPinned={post.isPinned}
              />
            )}
            <DeletePostButton
              postId={post.id}
              workspaceId={workspace.id}
              boardHref={boardHref}
            />
          </div>
        )}

        {/* Comments */}
        <div className="mt-10 border-t border-border pt-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-6">
            <MessageSquare className="size-4 text-muted-foreground" />
            {comments.length === 0
              ? "Comments"
              : `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}
          </h2>

          <CommentList
            comments={comments}
            workspaceId={workspace.id}
            currentUserId={session.user.id}
            canModerate={isAdminOrOwner}
          />

          <div className="mt-6 pt-6 border-t border-border">
            <CommentForm postId={post.id} workspaceId={workspace.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

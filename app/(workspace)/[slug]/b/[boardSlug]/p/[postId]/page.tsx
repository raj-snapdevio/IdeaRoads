import { format } from "date-fns";
import { ArrowLeft, ChevronUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { getBoardBySlug } from "@/lib/boards/queries";
import { getPost } from "@/lib/posts/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import { WORKSPACE_MEMBER } from "@/config/platform";
import DeletePostButton from "./_components/delete-post-button";
import StatusSelect from "./_components/status-select";

interface Props {
  params: Promise<{ slug: string; boardSlug: string; postId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params;
  const post = await getPost(postId);
  return { title: post?.title ?? "Post" };
}

export default async function PostDetailPage({ params }: Props) {
  const { slug, boardSlug, postId } = await params;

  const session = await requireSession();

  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const member = await getWorkspaceMember(workspace.id, session.user.id);
  if (!member) notFound();

  const board = await getBoardBySlug(workspace.id, boardSlug);
  if (!board) notFound();

  const post = await getPost(postId);
  if (!post || post.boardId !== board.id) notFound();

  const isAdminOrOwner = member.role !== WORKSPACE_MEMBER;
  const isAuthor = post.authorId === session.user.id;
  const canDelete = isAdminOrOwner || isAuthor;

  const boardHref = `/${slug}/b/${boardSlug}`;

  return (
    <div className="flex flex-col">
      {/* Back navigation */}
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
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-foreground leading-snug">
              {post.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
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
            </div>
          </div>

          {/* Vote count */}
          <div className="flex shrink-0 flex-col items-center gap-1 border border-border px-3 py-2.5">
            <ChevronUp className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {post.upvotes}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              votes
            </span>
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

        {/* Actions */}
        {canDelete && (
          <div className="mt-8 flex items-center gap-4 border-t border-border pt-4">
            <DeletePostButton
              postId={post.id}
              workspaceId={workspace.id}
              boardHref={boardHref}
            />
          </div>
        )}
      </div>
    </div>
  );
}

import { format } from "date-fns";
import { ArrowLeft, GitMerge } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CommentSection from "@/components/comments/comment-section";
import VoteButton from "@/components/voting/vote-button";
import { PortalHeader } from "@/components/workspace/portal-header";
import { WORKSPACE_MEMBER } from "@/config/platform";
import { getCurrentSession } from "@/lib/authz";
import {
  getBoardById,
  getBoardBySlug,
  listBoardsForWorkspace,
} from "@/lib/boards/queries";
import { getActiveCategoriesForWorkspace } from "@/lib/categories/queries";
import { getPost, getPostBySlug, listStatusHistory } from "@/lib/posts/queries";
import { hasUserVoted } from "@/lib/voting";
import { getActiveWorkspaceStatuses } from "@/lib/workspace-statuses/queries";
import {
  getWorkspaceBySlug,
  getWorkspaceMember,
} from "@/lib/workspaces/queries";
import CategorySelect from "./_components/category-select";
import DeletePostButton from "./_components/delete-post-button";
import EditPostButton from "./_components/edit-post-button";
import MergePostButton from "./_components/merge-post-button";
import MovePostButton from "./_components/move-post-button";
import PinButton from "./_components/pin-button";
import StatusSelect from "./_components/status-select";
import VoterListButton from "./_components/voter-list-button";

interface Props {
  params: Promise<{ slug: string; boardSlug: string; postSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, boardSlug, postSlug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) {
    return { title: "Post" };
  }
  const board = await getBoardBySlug(workspace.id, boardSlug);
  if (!board) {
    return { title: "Post" };
  }
  const post = await getPostBySlug(board.id, postSlug);
  return { title: post?.title ?? "Post" };
}

export default async function PostDetailPage({ params }: Props) {
  const { slug, boardSlug, postSlug } = await params;

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

  // Private boards are members-only. Archived boards stay publicly readable
  // (read-only — voting is disabled via the board's archived flag).
  if (!board.isPublic && !isMember) {
    notFound();
  }

  const post = await getPostBySlug(board.id, postSlug);
  if (!post) {
    notFound();
  }

  // Pending (unapproved) feedback is visible to members only.
  if (!post.isApproved && !isMember) {
    notFound();
  }

  const isAdminOrOwner = !!member && member.role !== WORKSPACE_MEMBER;
  const isAuthor = !!session && post.authorId === session.user.id;

  const [votedByUser, workspaceStatuses, categories, statusHistory] =
    await Promise.all([
      session ? hasUserVoted(post.id, { userId: session.user.id }) : false,
      getActiveWorkspaceStatuses(workspace.id),
      getActiveCategoriesForWorkspace(workspace.id),
      listStatusHistory(post.id),
    ]);

  // Active boards a member can move this post to (excludes archived).
  const moveTargets = isMember
    ? (await listBoardsForWorkspace(workspace.id))
        .filter((b) => !b.isArchived)
        .map((b) => ({ id: b.id, name: b.name, slug: b.slug }))
    : [];

  // If this post was merged into another, resolve the target's URL for the notice.
  let mergedTarget: { href: string; title: string } | null = null;
  if (post.mergedIntoId) {
    const target = await getPost(post.mergedIntoId);
    const targetBoard = target ? await getBoardById(target.boardId) : null;
    if (target && targetBoard) {
      mergedTarget = {
        title: target.title,
        href: `/${slug}/b/${targetBoard.slug}/p/${target.slug}`,
      };
    }
  }

  const statusMap = new Map(workspaceStatuses.map((s) => [s.slug, s.name]));
  const boardHref = `/${slug}/b/${boardSlug}`;

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
        {/* Back nav */}
        <div className="border-b border-border px-8 py-4">
          <Link
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={boardHref}
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
                  canEdit={isMember}
                  currentStatus={post.status}
                  postId={post.id}
                  workspaceId={workspace.id}
                  workspaceStatuses={workspaceStatuses}
                />
                <CategorySelect
                  canEdit={isMember}
                  categories={categories}
                  currentCategoryId={post.categoryId}
                  postId={post.id}
                  workspaceId={workspace.id}
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

            {/* Vote button + voter list */}
            <div className="shrink-0 flex flex-col items-center gap-2">
              <VoteButton
                initialCount={post.upvotes}
                initialHasVoted={votedByUser}
                isArchived={board.isArchived}
                isLocked={post.isLocked}
                isSignedIn={isSignedIn}
                postId={post.id}
              />
              {isMember && (
                <VoterListButton postId={post.id} voteCount={post.upvotes} />
              )}
            </div>
          </div>

          {/* Merged notice */}
          {mergedTarget && (
            <div className="mt-4 flex items-center gap-2 border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <GitMerge className="size-4 shrink-0" />
              <span>
                Merged into{" "}
                <Link
                  className="font-medium text-foreground hover:underline"
                  href={mergedTarget.href}
                >
                  {mergedTarget.title}
                </Link>
              </span>
            </div>
          )}

          {/* Post body */}
          {post.body && (
            <div className="mt-6 border-t border-border pt-6">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {post.body}
              </p>
            </div>
          )}

          {/* Triage / clean-up actions (workspace members) and author delete */}
          {(isMember || isAuthor) && (
            <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-border pt-4">
              {isMember && (
                <PinButton
                  isPinned={post.isPinned}
                  postId={post.id}
                  workspaceId={workspace.id}
                />
              )}
              {isMember && !post.mergedIntoId && (
                <>
                  <MovePostButton
                    boards={moveTargets}
                    currentBoardId={post.boardId}
                    postId={post.id}
                    workspaceId={workspace.id}
                    workspaceSlug={slug}
                  />
                  <MergePostButton
                    postId={post.id}
                    postTitle={post.title}
                    workspaceId={workspace.id}
                  />
                </>
              )}
              {(isAuthor || isAdminOrOwner) && (
                <EditPostButton
                  initialBody={post.body}
                  initialTitle={post.title}
                  postId={post.id}
                  workspaceId={workspace.id}
                />
              )}
              <DeletePostButton
                boardHref={boardHref}
                postId={post.id}
                workspaceId={workspace.id}
              />
            </div>
          )}

          {/* Status history */}
          {statusHistory.length > 0 && (
            <div className="mt-8 border-t border-border pt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Status history
              </h2>
              <ul className="space-y-2">
                {statusHistory.map((entry) => (
                  <li
                    className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground"
                    key={entry.id}
                  >
                    <span className="text-foreground">
                      {entry.fromStatus
                        ? `${statusMap.get(entry.fromStatus) ?? entry.fromStatus} → `
                        : ""}
                      {statusMap.get(entry.toStatus) ?? entry.toStatus}
                    </span>
                    <span>·</span>
                    <time dateTime={entry.createdAt.toISOString()}>
                      {format(entry.createdAt, "MMM d, yyyy")}
                    </time>
                    {isMember && entry.changedByName && (
                      <>
                        <span>·</span>
                        <span>by {entry.changedByName}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Comments */}
          <div className="mt-10 border-t border-border pt-8">
            <CommentSection
              canModerate={isAdminOrOwner}
              currentUserId={session?.user.id ?? null}
              isLocked={post.isLocked}
              isSignedIn={isSignedIn}
              postId={post.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

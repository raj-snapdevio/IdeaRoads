import { MessageSquare } from "lucide-react";
import { listComments } from "@/lib/comments";
import { getReactionsForComments } from "@/lib/comments/reactions";
import type { CommentData, ReactionGroup, ReplyData } from "./types";
import CommentThread from "./comment-thread";
import CommentModerationQueue from "./comment-moderation-queue";

interface CommentSectionProps {
  postId: string;
  isSignedIn: boolean;
  isLocked: boolean;
  currentUserId: string | null;
  canModerate: boolean;
}

export default async function CommentSection({
  postId,
  isSignedIn,
  isLocked,
  currentUserId,
  canModerate,
}: CommentSectionProps) {
  const raw = await listComments(postId, { includeUnapproved: canModerate });

  // Collect all comment IDs for batch reaction fetch
  const allIds = [
    ...raw.map((c) => c.id),
    ...raw.flatMap((c) => c.replies.map((r) => r.id)),
  ];

  const reactionsMap = await getReactionsForComments(allIds, currentUserId);

  // Serialize to client-safe types
  const allComments: CommentData[] = raw.map((c) => ({
    id: c.id,
    postId: c.postId,
    parentId: c.parentId,
    body: c.body,
    isDeleted: c.isDeleted,
    isApproved: c.isApproved,
    authorName: c.authorName,
    authorAvatar: c.authorAvatar,
    isGuest: !c.authorId,
    createdAt: c.createdAt.toISOString(),
    reactions: (reactionsMap.get(c.id) ?? []).sort((a, b) => b.count - a.count),
    replies: c.replies.map(
      (r): ReplyData => ({
        id: r.id,
        postId: r.postId,
        parentId: r.parentId,
        body: r.body,
        isDeleted: r.isDeleted,
        isApproved: r.isApproved,
        authorName: r.authorName,
        authorAvatar: r.authorAvatar,
        isGuest: !r.authorId,
        createdAt: r.createdAt.toISOString(),
        reactions: (reactionsMap.get(r.id) ?? []).sort(
          (a, b) => b.count - a.count
        ),
      })
    ),
  }));

  const approvedCount = allComments.filter(
    (c) => c.isApproved && !c.isDeleted
  ).length;

  const pending = canModerate
    ? [
        ...allComments.filter((c) => !c.isApproved && !c.isDeleted),
        ...allComments.flatMap((c) =>
          c.replies.filter((r) => !r.isApproved && !r.isDeleted)
        ),
      ]
    : [];

  return (
    <div>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-6">
        <MessageSquare className="size-4 text-muted-foreground" />
        {approvedCount === 0
          ? "Comments"
          : `${approvedCount} ${approvedCount === 1 ? "comment" : "comments"}`}
      </h2>

      <CommentThread
        initialComments={allComments}
        postId={postId}
        isSignedIn={isSignedIn}
        isLocked={isLocked}
        currentUserId={currentUserId}
        canModerate={canModerate}
      />

      {canModerate && pending.length > 0 && (
        <CommentModerationQueue pending={pending} />
      )}
    </div>
  );
}

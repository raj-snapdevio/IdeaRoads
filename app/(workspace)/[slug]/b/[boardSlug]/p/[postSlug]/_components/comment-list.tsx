"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { deleteCommentAction } from "@/app/actions/comments";

interface Comment {
  id: string;
  postId: string;
  authorId: string | null;
  authorName: string | null;
  authorEmail: string;
  content: string;
  createdAt: Date;
}

interface CommentListProps {
  comments: Comment[];
  workspaceId: string;
  currentUserId: string;
  canModerate: boolean;
}

function CommentItem({
  comment,
  workspaceId,
  currentUserId,
  canModerate,
}: {
  comment: Comment;
  workspaceId: string;
  currentUserId: string;
  canModerate: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const canDelete = canModerate || comment.authorId === currentUserId;

  function handleDelete() {
    if (!confirm("Delete this comment?")) return;
    startTransition(async () => {
      await deleteCommentAction({ commentId: comment.id, workspaceId });
      router.refresh();
    });
  }

  return (
    <div className="flex gap-3 py-4 border-b border-border last:border-0">
      <div className="flex size-7 shrink-0 items-center justify-center bg-muted text-muted-foreground text-xs font-semibold">
        {(comment.authorName ?? comment.authorEmail).charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xs font-medium text-foreground">
            {comment.authorName ?? comment.authorEmail}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
          </span>
        </div>
        <p className="mt-1 text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      </div>
      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors duration-150 focus-visible:outline-none disabled:opacity-50 self-start"
          aria-label="Delete comment"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export default function CommentList({
  comments,
  workspaceId,
  currentUserId,
  canModerate,
}: CommentListProps) {
  if (comments.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4">
        No comments yet. Be the first to comment.
      </p>
    );
  }

  return (
    <div>
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          workspaceId={workspaceId}
          currentUserId={currentUserId}
          canModerate={canModerate}
        />
      ))}
    </div>
  );
}

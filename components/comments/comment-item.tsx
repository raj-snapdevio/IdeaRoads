"use client";

import { formatDistanceToNow } from "date-fns";
import { CornerDownRight, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import CommentReactions from "./comment-reactions";
import type { CommentData, ReplyData } from "./types";

function getInitials(name: string | null): string {
  if (!name) {
    return "?";
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0]!.charAt(0).toUpperCase();
  }
  return (
    parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)
  ).toUpperCase();
}

interface CommentItemProps {
  canModerate: boolean;
  comment: CommentData | ReplyData;
  currentUserId: string | null;
  depth?: number;
  isLocked: boolean;
  isSignedIn: boolean;
  onDelete: (commentId: string) => void;
  onReply?: () => void;
}

export default function CommentItem({
  comment,
  currentUserId,
  canModerate,
  isLocked,
  isSignedIn,
  depth = 0,
  onReply,
  onDelete,
}: CommentItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const displayName =
    comment.authorName ?? (comment.isGuest ? "Anonymous" : "User");
  const initials = getInitials(comment.authorName);

  const canDelete = canModerate || (!!currentUserId && !!comment.authorName);
  const canReply = depth === 0 && !isLocked && onReply;
  const isPending = !comment.isApproved;

  async function handleConfirmDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        setShowDeleteDialog(false);
        onDelete(comment.id);
        toast.success("Comment deleted successfully");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to delete comment.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div
        className={`flex gap-3 py-3.5 ${depth === 0 ? "border-b border-border last:border-0" : ""}`}
      >
        {/* Avatar */}
        <div
          className={`shrink-0 flex items-center justify-center bg-muted text-muted-foreground text-xs font-semibold ${depth === 1 ? "size-6" : "size-7"}`}
        >
          {comment.authorAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={displayName}
              className={`object-cover ${depth === 1 ? "size-6" : "size-7"}`}
              src={comment.authorAvatar}
            />
          ) : (
            initials
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs font-medium text-foreground">
              {displayName}
            </span>
            {comment.isGuest && (
              <span className="text-2xs uppercase tracking-wide text-muted-foreground/60 border border-border px-1">
                Guest
              </span>
            )}
            {isPending && (
              <span className="text-2xs uppercase tracking-wide text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700 px-1">
                Pending
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>

          {/* Body — rendered as HTML from Quill */}
          <div
            className="comment-body mt-1 text-sm leading-relaxed text-foreground wrap-break-word"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: content from our own Quill editor
            dangerouslySetInnerHTML={{ __html: comment.body }}
          />

          {/* Reactions */}
          <CommentReactions
            commentId={comment.id}
            initialReactions={comment.reactions}
            isSignedIn={isSignedIn}
          />

          {/* Actions */}
          {(canReply || canDelete) && (
            <div className="mt-2 flex items-center gap-3">
              {canReply && (
                <button
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={onReply}
                >
                  <CornerDownRight className="size-3" />
                  Reply
                </button>
              )}
              {canDelete && (
                <button
                  aria-label="Delete comment"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground/40 hover:text-destructive transition-colors duration-150 focus-visible:outline-none"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="size-3" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this comment? This action cannot be undone."
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
        onOpenChange={setShowDeleteDialog}
        open={showDeleteDialog}
        title="Delete Comment"
      />
    </>
  );
}

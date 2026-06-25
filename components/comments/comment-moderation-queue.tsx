"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { CommentData, ReplyData } from "./types";

type PendingComment = (CommentData | ReplyData) & { replies?: ReplyData[] };

interface CommentModerationQueueProps {
  pending: PendingComment[];
}

function PendingCommentRow({
  comment,
  onApprove,
  onDelete,
}: {
  comment: PendingComment;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [isApproving, setIsApproving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  async function handleApprove() {
    setIsApproving(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}/approve`, {
        method: "PATCH",
      });
      if (res.ok) onApprove(comment.id);
    } catch {
      // silent
    } finally {
      setIsApproving(false);
    }
  }

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
      <div className="flex gap-3 py-3 border-b border-border last:border-0">
        <div className="flex size-7 shrink-0 items-center justify-center bg-muted text-muted-foreground text-xs font-semibold">
          {(comment.authorName ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs font-medium text-foreground">
              {comment.authorName ?? "Anonymous"}
            </span>
            {comment.isGuest && (
              <span className="text-2xs uppercase tracking-wide text-muted-foreground/60 border border-border px-1">
                Guest
              </span>
            )}
            {comment.parentId && (
              <span className="text-2xs uppercase tracking-wide text-muted-foreground/60 border border-border px-1">
                Reply
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          <p className="mt-1 text-sm text-foreground leading-relaxed whitespace-pre-wrap wrap-break-word">
            {comment.body}
          </p>
        </div>
        <div className="shrink-0 flex items-start gap-2 pt-0.5">
          <button
            onClick={handleApprove}
            disabled={isApproving || isDeleting}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none disabled:opacity-50"
            title="Approve"
          >
            <Check className="size-4 text-green-600" />
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            disabled={isApproving || isDeleting}
            className="text-xs text-muted-foreground/40 hover:text-destructive transition-colors duration-150 focus-visible:outline-none disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Comment"
        description="Are you sure you want to delete this comment? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        isPending={isDeleting}
        confirmLabel="Delete"
      />
    </>
  );
}

export default function CommentModerationQueue({
  pending: initialPending,
}: CommentModerationQueueProps) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingComment[]>(initialPending);

  if (pending.length === 0) return null;

  function handleApprove(id: string) {
    setPending((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  }

  function handleDelete(id: string) {
    setPending((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="mt-8 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-3">
        Pending Approval ({pending.length})
      </h3>
      <div>
        {pending.map((comment) => (
          <PendingCommentRow
            key={comment.id}
            comment={comment}
            onApprove={handleApprove}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}

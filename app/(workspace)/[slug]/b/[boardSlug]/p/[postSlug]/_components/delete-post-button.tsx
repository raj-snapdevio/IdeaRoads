"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deletePostAction } from "@/app/actions/posts";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface DeletePostButtonProps {
  boardHref: string;
  postId: string;
  workspaceId: string;
}

export default function DeletePostButton({
  postId,
  workspaceId,
  boardHref,
}: DeletePostButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDialog, setShowDialog] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      const result = await deletePostAction({ postId, workspaceId });
      if (result.success) {
        toast.success("Post deleted successfully");
        router.push(boardHref);
      } else {
        toast.error(result.error ?? "Failed to delete post.");
        setShowDialog(false);
      }
    });
  }

  return (
    <>
      <button
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        disabled={isPending}
        onClick={() => setShowDialog(true)}
      >
        <Trash2 className="size-3.5" />
        {isPending ? "Deleting…" : "Delete"}
      </button>

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to delete this post? This action cannot be undone."
        isPending={isPending}
        onConfirm={handleConfirm}
        onOpenChange={setShowDialog}
        open={showDialog}
        title="Delete Post"
      />
    </>
  );
}

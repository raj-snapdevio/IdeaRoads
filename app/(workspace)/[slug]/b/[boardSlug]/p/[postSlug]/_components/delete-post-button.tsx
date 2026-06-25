"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deletePostAction } from "@/app/actions/posts";

interface DeletePostButtonProps {
  postId: string;
  workspaceId: string;
  boardHref: string;
}

export default function DeletePostButton({
  postId,
  workspaceId,
  boardHref,
}: DeletePostButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this post? This cannot be undone.")) return;

    startTransition(async () => {
      const result = await deletePostAction({ postId, workspaceId });
      if (result.success) {
        router.push(boardHref);
      }
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <Trash2 className="size-3.5" />
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}

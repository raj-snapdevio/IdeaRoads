"use client";

import { FolderInput } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { movePostAction } from "@/app/actions/posts";

interface BoardOption {
  id: string;
  name: string;
  slug: string;
}

interface MovePostButtonProps {
  boards: BoardOption[];
  currentBoardId: string;
  postId: string;
  workspaceId: string;
  workspaceSlug: string;
}

export default function MovePostButton({
  postId,
  workspaceId,
  currentBoardId,
  workspaceSlug,
  boards,
}: MovePostButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const targets = boards.filter((b) => b.id !== currentBoardId);

  function handleMove(targetBoardId: string) {
    startTransition(async () => {
      const result = await movePostAction({
        postId,
        workspaceId,
        targetBoardId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Post moved");
      setOpen(false);
      router.push(
        `/${workspaceSlug}/b/${result.data.boardSlug}/p/${result.data.slug}`
      );
    });
  }

  if (targets.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        disabled={isPending}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <FolderInput className="size-3.5" />
        Move
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-44 border border-border bg-popover shadow-md">
          <p className="px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Move to board
          </p>
          <div className="max-h-60 overflow-y-auto">
            {targets.map((b) => (
              <button
                className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:bg-muted/60"
                disabled={isPending}
                key={b.id}
                onClick={() => handleMove(b.id)}
                type="button"
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

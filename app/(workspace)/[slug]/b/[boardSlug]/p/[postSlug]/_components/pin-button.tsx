"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pin, PinOff } from "lucide-react";
import { pinPostAction } from "@/app/actions/posts";

interface PinButtonProps {
  postId: string;
  workspaceId: string;
  isPinned: boolean;
}

export default function PinButton({
  postId,
  workspaceId,
  isPinned,
}: PinButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await pinPostAction({ postId, workspaceId, pin: !isPinned });
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      {isPinned ? (
        <>
          <PinOff className="size-3.5" />
          Unpin
        </>
      ) : (
        <>
          <Pin className="size-3.5" />
          Pin
        </>
      )}
    </button>
  );
}

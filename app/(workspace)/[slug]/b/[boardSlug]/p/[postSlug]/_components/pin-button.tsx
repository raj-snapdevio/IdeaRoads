"use client";

import { Pin, PinOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { pinPostAction } from "@/app/actions/posts";

interface PinButtonProps {
  isPinned: boolean;
  postId: string;
  workspaceId: string;
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
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      disabled={isPending}
      onClick={handleToggle}
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

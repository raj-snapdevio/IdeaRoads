"use client";

import { useState, useTransition } from "react";
import { ChevronUp } from "lucide-react";
import { toggleVoteAction } from "@/app/actions/votes";

interface VoteButtonProps {
  postId: string;
  workspaceId: string;
  initialUpvotes: number;
  initialVoted: boolean;
}

export default function VoteButton({
  postId,
  workspaceId,
  initialUpvotes,
  initialVoted,
}: VoteButtonProps) {
  const [voted, setVoted] = useState(initialVoted);
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleVoteAction({ postId, workspaceId });
      if (result.success) {
        setVoted(result.data.voted);
        setUpvotes(result.data.upvotes);
      }
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`flex flex-col items-center gap-1 border px-4 py-3 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
        voted
          ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
          : "border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
      }`}
      aria-pressed={voted}
      aria-label={voted ? "Remove vote" : "Vote for this post"}
    >
      <ChevronUp className="size-4" />
      <span className="text-sm font-semibold tabular-nums">{upvotes}</span>
      <span className="text-[10px] uppercase tracking-wide">
        {upvotes === 1 ? "vote" : "votes"}
      </span>
    </button>
  );
}

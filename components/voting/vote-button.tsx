"use client";

import { ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface VoteButtonProps {
  initialCount: number;
  initialHasVoted: boolean;
  isArchived?: boolean;
  isLocked?: boolean;
  isSignedIn: boolean;
  postId: string;
}

export default function VoteButton({
  postId,
  initialCount,
  initialHasVoted,
  isSignedIn,
  isLocked = false,
  isArchived = false,
}: VoteButtonProps) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [isPending, setIsPending] = useState(false);

  const disabled = isLocked || isArchived || isPending;
  const tooltip = isLocked
    ? "Voting is closed"
    : isArchived
      ? "This board is archived"
      : undefined;

  async function handleClick() {
    if (disabled) {
      return;
    }

    if (!isSignedIn) {
      // Voting requires sign-in — send the visitor to sign in, then back here.
      const next = encodeURIComponent(window.location.pathname);
      router.push(`/signin?next=${next}`);
      return;
    }

    // Optimistic update
    const wasVoted = hasVoted;
    const prevCount = count;
    setHasVoted(!wasVoted);
    setCount(wasVoted ? Math.max(0, count - 1) : count + 1);
    setIsPending(true);

    try {
      const method = wasVoted ? "DELETE" : "POST";
      const res = await fetch(`/api/posts/${postId}/vote`, { method });

      if (!res.ok) {
        // Revert optimistic update
        setHasVoted(wasVoted);
        setCount(prevCount);
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Something went wrong.");
        return;
      }

      if (!wasVoted) {
        const data = await res.json().catch(() => ({}));
        if (typeof data.voteCount === "number") {
          setCount(data.voteCount);
        }
      }
    } catch {
      setHasVoted(wasVoted);
      setCount(prevCount);
      toast.error("Network error. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      aria-label={hasVoted ? "Remove vote" : "Vote for this post"}
      aria-pressed={hasVoted}
      className={`flex flex-col items-center gap-1 border px-4 py-3 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        disabled && !isPending
          ? "cursor-not-allowed opacity-50 border-border text-muted-foreground"
          : hasVoted
            ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 cursor-pointer"
            : "border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground cursor-pointer"
      } ${isPending ? "opacity-70" : ""}`}
      disabled={disabled}
      onClick={handleClick}
      title={tooltip}
      type="button"
    >
      <ChevronUp className="size-4" />
      <span className="text-sm font-semibold tabular-nums">{count}</span>
      <span className="text-2xs uppercase tracking-wide">
        {count === 1 ? "vote" : "votes"}
      </span>
    </button>
  );
}

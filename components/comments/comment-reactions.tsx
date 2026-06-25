"use client";

import { useState } from "react";
import { Smile } from "lucide-react";
import { REACTION_EMOJIS } from "@/config/platform";
import type { ReactionGroup } from "./types";

interface CommentReactionsProps {
  commentId: string;
  initialReactions: ReactionGroup[];
  isSignedIn: boolean;
}

export default function CommentReactions({
  commentId,
  initialReactions,
  isSignedIn,
}: CommentReactionsProps) {
  const [reactions, setReactions] = useState<ReactionGroup[]>(initialReactions);
  const [showPicker, setShowPicker] = useState(false);
  const [pendingEmoji, setPendingEmoji] = useState<string | null>(null);

  async function handleReact(emoji: string) {
    if (!isSignedIn) return;
    if (pendingEmoji) return;

    setPendingEmoji(emoji);
    setShowPicker(false);

    // Optimistic update
    const existing = reactions.find((r) => r.emoji === emoji);
    if (existing) {
      if (existing.hasReacted) {
        // Remove
        setReactions((prev) =>
          prev
            .map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.count - 1, hasReacted: false }
                : r
            )
            .filter((r) => r.count > 0)
        );
      } else {
        // Add to existing
        setReactions((prev) =>
          prev.map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.count + 1, hasReacted: true }
              : r
          )
        );
      }
    } else {
      // New reaction
      setReactions((prev) => [...prev, { emoji, count: 1, hasReacted: true }]);
    }

    try {
      await fetch(`/api/comments/${commentId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
    } catch {
      // Revert on error - refetch would be ideal but keep simple
      setReactions(initialReactions);
    } finally {
      setPendingEmoji(null);
    }
  }

  const hasAnyReaction = reactions.length > 0;

  return (
    <div className="relative flex items-center gap-1 flex-wrap mt-2">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => handleReact(r.emoji)}
          disabled={!isSignedIn || !!pendingEmoji}
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 ${
            r.hasReacted
              ? "border-primary/40 bg-primary/5 text-foreground"
              : "border-border bg-transparent text-foreground hover:border-muted-foreground/50"
          }`}
        >
          <span>{r.emoji}</span>
          <span className="tabular-nums">{r.count}</span>
        </button>
      ))}

      {isSignedIn && (
        <div className="relative">
          <button
            onClick={() => setShowPicker((v) => !v)}
            disabled={!!pendingEmoji}
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
              hasAnyReaction
                ? "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
            }`}
            aria-label="Add reaction"
          >
            <Smile className="size-3" />
          </button>

          {showPicker && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowPicker(false)}
              />
              <div className="absolute left-0 bottom-full mb-1.5 z-20 flex gap-1 p-1.5 bg-background border border-border shadow-sm">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className="p-1 text-base hover:bg-muted transition-colors duration-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring leading-none"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

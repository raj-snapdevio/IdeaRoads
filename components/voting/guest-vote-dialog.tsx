"use client";

import { X } from "lucide-react";
import { useState } from "react";

interface GuestVoteDialogProps {
  onClose: () => void;
  onRemoved: (voteCount: number) => void;
  onVoted: (voteCount: number) => void;
  postId: string;
}

export default function GuestVoteDialog({
  postId,
  onVoted,
  onRemoved,
  onClose,
}: GuestVoteDialogProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.status === 200) {
        // Already voted
        setAlreadyVoted(true);
        setIsPending(false);
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setIsPending(false);
        return;
      }

      onVoted(data.voteCount);
      onClose();
    } catch {
      setError("Network error. Please try again.");
      setIsPending(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setIsPending(true);

    try {
      const res = await fetch(
        `/api/posts/${postId}/vote?email=${encodeURIComponent(email.trim())}`,
        { method: "DELETE" }
      );

      if (res.status === 404) {
        setError("No vote found for this email on this post.");
        setIsPending(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong.");
        setIsPending(false);
        return;
      }

      // Get updated vote count
      const updated = await fetch(`/api/posts/${postId}/vote`, {
        method: "GET",
      }).catch(() => null);
      onRemoved(0);
      onClose();
    } catch {
      setError("Network error. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm bg-background border border-border shadow-lg p-6 mx-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Vote on this idea
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter your email to cast your vote. You can remove it at any time.
            </p>
          </div>
          <button
            aria-label="Close"
            className="ml-4 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>

        {alreadyVoted ? (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              You&apos;ve already voted from this email. Remove your vote?
            </p>
            {error && <p className="text-xs text-destructive mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                className="flex-1 py-2 text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                disabled={isPending}
                onClick={handleRemove}
              >
                {isPending ? "Removing…" : "Remove Vote"}
              </button>
              <button
                className="flex-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <div>
              <label
                className="block text-xs font-medium text-foreground mb-1"
                htmlFor="guest-email"
              >
                Email <span className="text-destructive">*</span>
              </label>
              <input
                className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                id="guest-email"
                maxLength={255}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium text-foreground mb-1"
                htmlFor="guest-name"
              >
                Name <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                id="guest-name"
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                type="text"
                value={name}
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <button
              className="w-full py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={isPending || !email.trim()}
              type="submit"
            >
              {isPending ? "Casting vote…" : "Cast Vote"}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Have an account?{" "}
              <a
                className="text-foreground underline underline-offset-2 hover:text-foreground/80"
                href="/login"
              >
                Sign in instead
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

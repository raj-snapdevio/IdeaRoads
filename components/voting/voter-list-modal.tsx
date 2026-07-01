"use client";

import { formatDistanceToNow } from "date-fns";
import { UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";

interface Voter {
  email: string | null;
  id: string;
  image: string | null;
  isGuest: boolean;
  name: string | null;
  votedAt: string;
}

interface VoterListModalProps {
  onClose: () => void;
  postId: string;
  voteCount: number;
}

export default function VoterListModal({
  postId,
  voteCount,
  onClose,
}: VoterListModalProps) {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [total, setTotal] = useState(voteCount);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    loadVoters(1);
  }, []);

  async function loadVoters(p: number) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/posts/${postId}/vote/voters?page=${p}&limit=50`
      );
      if (!res.ok) {
        setError("Failed to load voters.");
        return;
      }
      const data: { voters: Voter[]; total: number } = await res.json();
      setTotal(data.total);
      setVoters((prev) => (p === 1 ? data.voters : [...prev, ...data.voters]));
      setHasMore(data.voters.length === 50);
      setPage(p);
    } catch {
      setError("Failed to load voters.");
    } finally {
      setIsLoading(false);
    }
  }

  function loadMore() {
    loadVoters(page + 1);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md bg-background border border-border shadow-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Voters</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total} {total === 1 ? "person" : "people"} voted on this post
            </p>
          </div>
          <button
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {isLoading && voters.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : voters.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No voters yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {voters.map((voter) => (
                <li
                  className="flex items-center gap-3 px-5 py-3"
                  key={voter.id}
                >
                  {/* Avatar */}
                  <div className="size-7 shrink-0 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {voter.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={voter.name ?? ""}
                        className="size-full object-cover"
                        src={voter.image}
                      />
                    ) : (
                      <UserRound className="size-3.5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-foreground truncate">
                        {voter.name ?? voter.email ?? "Unknown"}
                      </span>
                    </div>
                    {voter.name && voter.email && (
                      <p className="text-xs text-muted-foreground truncate">
                        {voter.email}
                      </p>
                    )}
                  </div>

                  {/* Time */}
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(voter.votedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {hasMore && (
            <div className="px-5 py-3 border-t border-border">
              <button
                className="w-full py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                disabled={isLoading}
                onClick={loadMore}
              >
                {isLoading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

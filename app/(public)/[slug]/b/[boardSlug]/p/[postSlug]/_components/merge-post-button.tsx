"use client";

import { GitMerge } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { mergePostAction, searchMergeTargetsAction } from "@/app/actions/posts";

interface MergeTarget {
  id: string;
  title: string;
  upvotes: number;
}

interface MergePostButtonProps {
  postId: string;
  postTitle: string;
  workspaceId: string;
}

export default function MergePostButton({
  postId,
  postTitle,
  workspaceId,
}: MergePostButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MergeTarget[]>([]);
  const [selected, setSelected] = useState<MergeTarget | null>(null);

  function runSearch(q: string) {
    setQuery(q);
    setSelected(null);
    startTransition(async () => {
      const result = await searchMergeTargetsAction({
        workspaceId,
        query: q,
        excludePostId: postId,
      });
      if (result.success) {
        setResults(result.data.posts);
      }
    });
  }

  function handleMerge() {
    if (!selected) {
      return;
    }
    startTransition(async () => {
      const result = await mergePostAction({
        sourceId: postId,
        targetId: selected.id,
        workspaceId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Post merged");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        disabled={isPending}
        onClick={() => {
          setOpen((v) => !v);
          if (!open && results.length === 0) {
            runSearch("");
          }
        }}
        type="button"
      >
        <GitMerge className="size-3.5" />
        Merge
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-80 border border-border bg-popover shadow-md p-3 space-y-2">
          <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Merge into another post
          </p>
          <input
            className="w-full px-3 py-2 text-sm border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            onChange={(e) => runSearch(e.target.value)}
            placeholder="Search posts…"
            type="text"
            value={query}
          />

          <div className="max-h-56 overflow-y-auto border border-border divide-y divide-border">
            {results.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">
                No matching posts.
              </p>
            ) : (
              results.map((r) => (
                <button
                  className={`block w-full px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none ${
                    selected?.id === r.id
                      ? "bg-primary/10 text-foreground"
                      : "text-foreground hover:bg-muted/60"
                  }`}
                  key={r.id}
                  onClick={() => setSelected(r)}
                  type="button"
                >
                  <span className="line-clamp-1">{r.title}</span>
                  <span className="text-2xs text-muted-foreground">
                    ↑ {r.upvotes}
                  </span>
                </button>
              ))
            )}
          </div>

          {selected && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-muted-foreground">
                Merge <span className="font-medium">"{postTitle}"</span> into{" "}
                <span className="font-medium">"{selected.title}"</span>? Votes
                transfer to the target and this post is locked.
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isPending}
                  onClick={handleMerge}
                  type="button"
                >
                  {isPending ? "Merging…" : "Merge"}
                </button>
                <button
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setSelected(null)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

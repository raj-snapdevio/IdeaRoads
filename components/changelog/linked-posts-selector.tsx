"use client";

import { Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { searchPostsForChangelogAction } from "@/app/actions/changelog";

interface Post {
  boardName: string;
  boardSlug: string;
  id: string;
  slug: string;
  status: string;
  title: string;
  upvotes: number;
}

interface LinkedPostsSelectorProps {
  onChange: (posts: Post[]) => void;
  selectedPosts: Post[];
  workspaceId: string;
}

export function LinkedPostsSelector({
  workspaceId,
  selectedPosts,
  onChange,
}: LinkedPostsSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Post[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedIds = new Set(selectedPosts.map((p) => p.id));

  const search = useCallback(
    (q: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        startTransition(async () => {
          const result = await searchPostsForChangelogAction({
            workspaceId,
            query: q,
          });
          if (result.success) {
            setResults(result.data.filter((p) => !selectedIds.has(p.id)));
          }
        });
      }, 250);
    },
    [workspaceId, selectedIds]
  );

  useEffect(() => {
    if (isOpen) {
      search(query);
    }
  }, [query, isOpen, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addPost(post: Post) {
    if (selectedPosts.length >= 20) {
      return;
    }
    onChange([...selectedPosts, post]);
    setQuery("");
    setIsOpen(false);
  }

  function removePost(postId: string) {
    onChange(selectedPosts.filter((p) => p.id !== postId));
  }

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selectedPosts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedPosts.map((post) => (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium bg-muted text-foreground border border-border"
              key={post.id}
              style={{ borderRadius: 2 }}
            >
              <span className="truncate max-w-[200px]">{post.title}</span>
              <button
                aria-label={`Remove ${post.title}`}
                className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
                onClick={() => removePost(post.id)}
                type="button"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      {selectedPosts.length < 20 && (
        <div className="relative" ref={containerRef}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              className="w-full border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Search posts to link…"
              type="text"
              value={query}
            />
          </div>

          {/* Dropdown */}
          {isOpen && results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-background border border-border shadow-md max-h-52 overflow-y-auto">
              {results.map((post) => (
                <button
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors focus-visible:outline-none focus-visible:bg-muted"
                  key={post.id}
                  onClick={() => addPost(post)}
                  type="button"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">
                      {post.title}
                    </span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {post.boardName}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    ↑ {post.upvotes}
                  </span>
                </button>
              ))}
            </div>
          )}

          {isOpen && query && results.length === 0 && (
            <div className="absolute z-20 mt-1 w-full bg-background border border-border shadow-md">
              <p className="px-3 py-3 text-sm text-muted-foreground">
                No posts found.
              </p>
            </div>
          )}
        </div>
      )}

      {selectedPosts.length >= 20 && (
        <p className="text-xs text-muted-foreground">
          Maximum 20 linked posts reached.
        </p>
      )}
    </div>
  );
}

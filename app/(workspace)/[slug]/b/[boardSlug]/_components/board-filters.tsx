"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useTransition } from "react";
import { Search, X } from "lucide-react";
import { POST_STATUSES, type PostStatus } from "@/lib/posts/constants";
import { STATUS_LABEL } from "./post-status-badge";

interface BoardFiltersProps {
  activeSort: "newest" | "top";
  activeStatus: string;
  activeSearch: string;
  myVotesActive: boolean;
  showMyVotes: boolean;
}

const SORT_TABS = [
  { label: "Newest", value: "newest" },
  { label: "Most Voted", value: "top" },
] as const;

export default function BoardFilters({
  activeSort,
  activeStatus,
  activeSearch,
  myVotesActive,
  showMyVotes,
}: BoardFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParam = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "newest") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
      });
    },
    [router, pathname, searchParams]
  );

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParam({ q: value || null });
    }, 300);
  }

  function toggleMyVotes() {
    updateParam({ myVotes: myVotesActive ? null : "true" });
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Sort + Status + My Votes row */}
      <div className="flex items-center justify-between border-b border-border px-4">
        {/* Sort tabs */}
        <div className="flex">
          {SORT_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => updateParam({ sort: tab.value })}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-150 focus-visible:outline-none ${
                activeSort === tab.value
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right controls: My Votes + Status */}
        <div className="flex items-center gap-3">
          {showMyVotes && (
            <button
              onClick={toggleMyVotes}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium border transition-colors duration-150 focus-visible:outline-none ${
                myVotesActive
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
              }`}
            >
              My Votes
              {myVotesActive && <X className="size-2.5" />}
            </button>
          )}

          <select
            value={activeStatus}
            onChange={(e) => updateParam({ status: e.target.value || null })}
            className="text-xs border-0 bg-transparent text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer py-1 pr-6 pl-1"
          >
            <option value="">All statuses</option>
            {POST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative border-b border-border">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <input
          type="search"
          defaultValue={activeSearch}
          onChange={handleSearch}
          placeholder="Search posts…"
          className="w-full bg-transparent py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {activeSearch && (
          <button
            onClick={() => updateParam({ q: null })}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

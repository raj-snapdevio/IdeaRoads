"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useTransition } from "react";

interface WorkspaceStatus {
  color: string;
  name: string;
  slug: string;
}

interface Category {
  color: string;
  id: string;
  isArchived: boolean;
  name: string;
}

interface BoardFiltersProps {
  activeCategoryId: string;
  activeSearch: string;
  activeSort: "newest" | "top";
  activeStatus: string;
  categories: Category[];
  myVotesActive: boolean;
  showMyVotes: boolean;
  workspaceStatuses: WorkspaceStatus[];
}

const SORT_TABS = [
  { label: "Newest", value: "newest" },
  { label: "Most Voted", value: "top" },
] as const;

export default function BoardFilters({
  activeSort,
  activeStatus,
  activeCategoryId,
  activeSearch,
  myVotesActive,
  showMyVotes,
  workspaceStatuses,
  categories,
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
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      updateParam({ q: value || null });
    }, 300);
  }

  function toggleMyVotes() {
    updateParam({ myVotes: myVotesActive ? null : "true" });
  }

  const activeCategories = categories.filter((c) => !c.isArchived);

  return (
    <div className="flex flex-col gap-0">
      {/* Sort + Status + Category + My Votes row */}
      <div className="flex items-center justify-between border-b border-border px-4">
        {/* Sort tabs */}
        <div className="flex">
          {SORT_TABS.map((tab) => (
            <button
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer duration-150 focus-visible:outline-none ${
                activeSort === tab.value
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              key={tab.value}
              onClick={() => updateParam({ sort: tab.value })}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {showMyVotes && (
            <button
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium border transition-colors cursor-pointer duration-150 focus-visible:outline-none ${
                myVotesActive
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
              }`}
              onClick={toggleMyVotes}
            >
              My Votes
              {myVotesActive && <X className="size-2.5" />}
            </button>
          )}

          {/* Category filter */}
          {activeCategories.length > 0 && (
            <select
              className="text-xs border-0 bg-transparent text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer py-1 pr-6 pl-1"
              onChange={(e) =>
                updateParam({ category: e.target.value || null })
              }
              value={activeCategoryId}
            >
              <option value="">All categories</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Status filter */}
          <select
            className="text-xs border-0 bg-transparent text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer py-1 pr-6 pl-1"
            onChange={(e) => updateParam({ status: e.target.value || null })}
            value={activeStatus}
          >
            <option value="">All statuses</option>
            {workspaceStatuses.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative border-b border-border">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <input
          className="w-full bg-transparent py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          defaultValue={activeSearch}
          onChange={handleSearch}
          placeholder="Search posts…"
          type="search"
        />
        {activeSearch && (
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => updateParam({ q: null })}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

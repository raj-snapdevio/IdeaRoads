"use client";

import { useState } from "react";
import type { RoadmapPost, RoadmapStatus } from "@/lib/roadmap/queries";
import { RoadmapEmptyState } from "./roadmap-empty-state";
import { RoadmapPostCard } from "./roadmap-post-card";

const COLUMN_CONFIG: Record<
  RoadmapStatus,
  { label: string; headerBg: string; badgeBg: string; badgeText: string }
> = {
  planned: {
    label: "Planned",
    headerBg: "bg-blue-50 dark:bg-blue-950/30",
    badgeBg: "bg-blue-100 dark:bg-blue-900/40",
    badgeText: "text-blue-700 dark:text-blue-300",
  },
  in_progress: {
    label: "In Progress",
    headerBg: "bg-violet-50 dark:bg-violet-950/30",
    badgeBg: "bg-violet-100 dark:bg-violet-900/40",
    badgeText: "text-violet-700 dark:text-violet-300",
  },
  completed: {
    label: "Completed",
    headerBg: "bg-green-50 dark:bg-green-950/30",
    badgeBg: "bg-green-100 dark:bg-green-900/40",
    badgeText: "text-green-700 dark:text-green-300",
  },
};

const PAGE_SIZE = 10;

interface RoadmapColumnProps {
  status: RoadmapStatus;
  posts: RoadmapPost[];
  workspaceSlug: string;
  isSignedIn: boolean;
}

export function RoadmapColumn({
  status,
  posts,
  workspaceSlug,
  isSignedIn,
}: RoadmapColumnProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const config = COLUMN_CONFIG[status];
  const visible = posts.slice(0, visibleCount);
  const hasMore = posts.length > visibleCount;

  return (
    <div className="flex flex-col min-w-0">
      {/* Column header */}
      <div className={`${config.headerBg} px-4 py-3 border border-border mb-3`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            {config.label}
          </h2>
          <span
            className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold ${config.badgeBg} ${config.badgeText}`}
          >
            {posts.length}
          </span>
        </div>
      </div>

      {/* Post cards */}
      <div className="flex flex-col gap-2">
        {visible.length === 0 ? (
          <div className="border border-dashed border-border">
            <RoadmapEmptyState status={status} />
          </div>
        ) : (
          <>
            {visible.map((post) => (
              <RoadmapPostCard
                key={post.id}
                post={post}
                workspaceSlug={workspaceSlug}
                isSignedIn={isSignedIn}
              />
            ))}
            {hasMore && (
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-border/80 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Show {Math.min(PAGE_SIZE, posts.length - visibleCount)} more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

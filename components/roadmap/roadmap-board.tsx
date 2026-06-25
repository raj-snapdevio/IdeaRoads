import type { RoadmapData } from "@/lib/roadmap/queries";
import { RoadmapColumn } from "./roadmap-column";

interface RoadmapBoardProps {
  data: RoadmapData;
  workspaceSlug: string;
  isSignedIn: boolean;
  isAdmin?: boolean;
}

export function RoadmapBoard({
  data,
  workspaceSlug,
  isSignedIn,
  isAdmin,
}: RoadmapBoardProps) {
  return (
    <div className="px-6 pb-12">
      {isAdmin && (
        <div className="mb-6 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300 text-xs font-medium">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
          Admin view — includes posts from private boards
        </div>
      )}

      {/* Three-column kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RoadmapColumn
          status="planned"
          posts={data.planned}
          workspaceSlug={workspaceSlug}
          isSignedIn={isSignedIn}
        />
        <RoadmapColumn
          status="in_progress"
          posts={data.in_progress}
          workspaceSlug={workspaceSlug}
          isSignedIn={isSignedIn}
        />
        <RoadmapColumn
          status="completed"
          posts={data.completed}
          workspaceSlug={workspaceSlug}
          isSignedIn={isSignedIn}
        />
      </div>
    </div>
  );
}

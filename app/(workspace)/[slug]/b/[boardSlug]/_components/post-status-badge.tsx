import type { PostStatus } from "@/lib/posts/constants";

export const STATUS_LABEL: Record<PostStatus, string> = {
  open: "Open",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  closed: "Closed",
};

export const STATUS_CLASSES: Record<PostStatus, string> = {
  open: "bg-muted text-muted-foreground",
  under_review:
    "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300",
  planned:
    "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  in_progress:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  completed: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  closed: "bg-muted text-muted-foreground/70",
};

interface WorkspaceStatus {
  slug: string;
  name: string;
  color: string;
}

interface PostStatusBadgeProps {
  status: string;
  workspaceStatuses?: WorkspaceStatus[];
}

export function PostStatusBadge({
  status,
  workspaceStatuses,
}: PostStatusBadgeProps) {
  // Use workspace status if available for custom label/color
  if (workspaceStatuses) {
    const ws = workspaceStatuses.find((s) => s.slug === status);
    if (ws) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium"
          style={{
            backgroundColor: `${ws.color}18`,
            color: ws.color,
            borderRadius: 2,
          }}
        >
          {ws.name}
        </span>
      );
    }
  }

  // Fallback to hardcoded labels for known statuses
  const label = STATUS_LABEL[status as PostStatus] ?? status.replace(/_/g, " ");
  const classes =
    STATUS_CLASSES[status as PostStatus] ?? "bg-muted text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium ${classes}`}
    >
      {label}
    </span>
  );
}

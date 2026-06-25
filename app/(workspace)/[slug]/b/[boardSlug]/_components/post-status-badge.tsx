import type { PostStatus } from "@/lib/posts/constants";

export const STATUS_LABEL: Record<PostStatus, string> = {
  open: "Open",
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  closed: "Closed",
};

export const STATUS_CLASSES: Record<PostStatus, string> = {
  open: "bg-muted text-muted-foreground",
  planned:
    "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  in_progress:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  completed: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  closed: "bg-muted text-muted-foreground/70",
};

export function PostStatusBadge({ status }: { status: PostStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

import type { PostStatus } from "@/lib/posts/queries";

const STATUS_LABEL: Record<PostStatus, string> = {
  open: "Open",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  done: "Done",
  declined: "Declined",
};

const STATUS_CLASSES: Record<PostStatus, string> = {
  open: "bg-muted text-muted-foreground",
  under_review: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  planned:
    "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  in_progress:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  done: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  declined: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
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

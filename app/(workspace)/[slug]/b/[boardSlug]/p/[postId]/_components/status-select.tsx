"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { updatePostStatusAction } from "@/app/actions/posts";
import type { PostStatus } from "@/lib/posts/queries";

interface StatusSelectProps {
  postId: string;
  workspaceId: string;
  currentStatus: PostStatus;
  canEdit: boolean;
}

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

const ALL_STATUSES: PostStatus[] = [
  "open",
  "under_review",
  "planned",
  "in_progress",
  "done",
  "declined",
];

export default function StatusSelect({
  postId,
  workspaceId,
  currentStatus,
  canEdit,
}: StatusSelectProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as PostStatus;
    if (status === currentStatus) return;

    startTransition(async () => {
      await updatePostStatusAction({ postId, workspaceId, status });
      router.refresh();
    });
  }

  if (!canEdit) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[currentStatus]}`}
      >
        {STATUS_LABEL[currentStatus]}
      </span>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        value={currentStatus}
        onChange={handleChange}
        disabled={isPending}
        className={`appearance-none pl-2.5 pr-7 py-1 text-xs font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${STATUS_CLASSES[currentStatus]}`}
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 size-3 opacity-60" />
    </div>
  );
}

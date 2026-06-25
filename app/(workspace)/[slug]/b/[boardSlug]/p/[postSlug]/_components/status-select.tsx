"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { updatePostStatusAction } from "@/app/actions/posts";
import { POST_STATUSES, type PostStatus } from "@/lib/posts/constants";
import {
  STATUS_CLASSES,
  STATUS_LABEL,
} from "../../../_components/post-status-badge";

interface StatusSelectProps {
  postId: string;
  workspaceId: string;
  currentStatus: PostStatus;
  canEdit: boolean;
}

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
        {POST_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 size-3 opacity-60" />
    </div>
  );
}

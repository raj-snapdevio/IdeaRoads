"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updatePostStatusAction } from "@/app/actions/posts";

interface WorkspaceStatus {
  color: string;
  id: string;
  isArchived: boolean;
  name: string;
  slug: string;
}

interface StatusSelectProps {
  canEdit: boolean;
  currentStatus: string;
  postId: string;
  workspaceId: string;
  workspaceStatuses: WorkspaceStatus[];
}

export default function StatusSelect({
  postId,
  workspaceId,
  currentStatus,
  canEdit,
  workspaceStatuses,
}: StatusSelectProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const activeStatuses = workspaceStatuses.filter((s) => !s.isArchived);
  const current = workspaceStatuses.find((s) => s.slug === currentStatus);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value;
    if (status === currentStatus) {
      return;
    }

    startTransition(async () => {
      await updatePostStatusAction({ postId, workspaceId, status });
      router.refresh();
    });
  }

  const displayName = current?.name ?? currentStatus.replace(/_/g, " ");
  const displayColor = current?.color ?? "#6b7280";

  if (!canEdit) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium"
        style={{
          backgroundColor: `${displayColor}18`,
          color: displayColor,
          borderRadius: 2,
        }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: displayColor }}
        />
        {displayName}
      </span>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        className="appearance-none bg-muted pl-2.5 pr-7 py-1 text-xs font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        disabled={isPending}
        onChange={handleChange}
        style={{ borderRadius: 2 }}
        value={currentStatus}
      >
        {activeStatuses.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 size-3 text-muted-foreground opacity-60" />
    </div>
  );
}

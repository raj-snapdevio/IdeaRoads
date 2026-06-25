"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { updatePostStatusAction } from "@/app/actions/posts";

interface WorkspaceStatus {
  id: string;
  slug: string;
  name: string;
  color: string;
  isArchived: boolean;
}

interface StatusSelectProps {
  postId: string;
  workspaceId: string;
  currentStatus: string;
  canEdit: boolean;
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
    if (status === currentStatus) return;

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
        value={currentStatus}
        onChange={handleChange}
        disabled={isPending}
        className="appearance-none pl-6 pr-7 py-1 text-xs font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        style={{
          backgroundColor: `${displayColor}18`,
          color: displayColor,
          borderRadius: 2,
        }}
      >
        {activeStatuses.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.name}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute left-2 inline-block w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: displayColor }}
      />
      <ChevronDown
        className="pointer-events-none absolute right-1.5 size-3 opacity-60"
        style={{ color: displayColor }}
      />
    </div>
  );
}

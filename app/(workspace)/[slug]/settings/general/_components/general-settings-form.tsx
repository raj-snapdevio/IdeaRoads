"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateWorkspaceSettingsAction } from "@/app/actions/workspace-settings";

interface GeneralSettingsFormProps {
  workspaceId: string;
  workspaceSlug: string;
  roadmapPublic: boolean;
  changelogPublic: boolean;
  canManage: boolean;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-border last:border-0 p-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export function GeneralSettingsForm({
  workspaceId,
  workspaceSlug,
  roadmapPublic,
  changelogPublic,
  canManage,
}: GeneralSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "");

  function handleRoadmapToggle(value: boolean) {
    startTransition(async () => {
      const result = await updateWorkspaceSettingsAction({
        workspaceId,
        roadmapPublic: value,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        value ? "Public roadmap enabled" : "Public roadmap disabled"
      );
      router.refresh();
    });
  }

  function handleChangelogToggle(value: boolean) {
    startTransition(async () => {
      const result = await updateWorkspaceSettingsAction({
        workspaceId,
        changelogPublic: value,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        value ? "Public changelog enabled" : "Public changelog disabled"
      );
      router.refresh();
    });
  }

  return (
    <div className="px-8 py-6 max-w-2xl">
      <div className="border border-border divide-y divide-border">
        <ToggleRow
          label="Public Roadmap"
          description={`Show your roadmap at ${appUrl}/${workspaceSlug}/roadmap. Anyone with the link can view your planned and completed work.`}
          checked={roadmapPublic}
          onChange={handleRoadmapToggle}
          disabled={isPending || !canManage}
        />
        <ToggleRow
          label="Public Changelog"
          description={`Show your changelog at ${appUrl}/${workspaceSlug}/changelog. Anyone with the link can read your published updates.`}
          checked={changelogPublic}
          onChange={handleChangelogToggle}
          disabled={isPending || !canManage}
        />
      </div>

      {!canManage && (
        <p className="mt-4 text-xs text-muted-foreground">
          Only owners and admins can change workspace settings.
        </p>
      )}
    </div>
  );
}

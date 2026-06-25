"use client";

import { Archive, Check, Edit2, Plus, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createWorkspaceStatusAction,
  deleteWorkspaceStatusAction,
  setDefaultStatusAction,
  updateWorkspaceStatusAction,
} from "@/app/actions/workspace-statuses";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const COLOR_PRESETS = [
  "#6b7280",
  "#374151",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
];

interface WorkspaceStatus {
  id: string;
  name: string;
  slug: string;
  color: string;
  isDefault: boolean;
  isArchived: boolean;
  displayOrder: number;
}

interface StatusListProps {
  statuses: WorkspaceStatus[];
  workspaceId: string;
  canManage: boolean;
}

interface FormState {
  mode: "create" | "edit";
  statusId?: string;
  name: string;
  color: string;
}

const DEFAULT_FORM: FormState = {
  mode: "create",
  name: "",
  color: "#6b7280",
};

export function StatusList({
  statuses,
  workspaceId,
  canManage,
}: StatusListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceStatus | null>(
    null
  );
  const [archiveTarget, setArchiveTarget] = useState<WorkspaceStatus | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setForm({ ...DEFAULT_FORM });
    setError(null);
  }

  function openEdit(s: WorkspaceStatus) {
    setForm({ mode: "edit", statusId: s.id, name: s.name, color: s.color });
    setError(null);
  }

  function closeForm() {
    setForm(null);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    startTransition(async () => {
      let result;
      if (form.mode === "create") {
        result = await createWorkspaceStatusAction({
          workspaceId,
          name: trimmedName,
          color: form.color,
        });
      } else {
        result = await updateWorkspaceStatusAction({
          statusId: form.statusId!,
          workspaceId,
          name: trimmedName,
          color: form.color,
        });
      }

      if (!result.success) {
        setError(result.error);
        return;
      }

      toast.success(
        form.mode === "create" ? "Status created" : "Status updated"
      );
      closeForm();
      router.refresh();
    });
  }

  function handleSetDefault(s: WorkspaceStatus) {
    startTransition(async () => {
      const result = await setDefaultStatusAction({
        statusId: s.id,
        workspaceId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`"${s.name}" is now the default status`);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteWorkspaceStatusAction({
        statusId: deleteTarget.id,
        workspaceId,
      });
      setDeleteTarget(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Status deleted");
      router.refresh();
    });
  }

  function handleArchiveToggle() {
    if (!archiveTarget) return;
    startTransition(async () => {
      const result = await updateWorkspaceStatusAction({
        statusId: archiveTarget.id,
        workspaceId,
        isArchived: !archiveTarget.isArchived,
      });
      setArchiveTarget(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        archiveTarget.isArchived ? "Status restored" : "Status archived"
      );
      router.refresh();
    });
  }

  const active = statuses.filter((s) => !s.isArchived);
  const archived = statuses.filter((s) => s.isArchived);

  return (
    <div className="px-8 py-6 max-w-2xl space-y-6">
      {/* Add button */}
      {canManage && !form && (
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-3.5" />
          New Status
        </button>
      )}

      {/* Inline form */}
      {form && canManage && (
        <form
          onSubmit={handleSubmit}
          className="border border-border p-4 space-y-4"
        >
          <h3 className="text-sm font-semibold text-foreground">
            {form.mode === "create" ? "New Status" : "Edit Status"}
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => f && { ...f, name: e.target.value })
                }
                placeholder="e.g. Needs More Info"
                maxLength={48}
                className="w-full px-3 py-2 text-sm border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => f && { ...f, color: c })}
                    className="size-6 rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{
                      backgroundColor: c,
                      borderColor: form.color === c ? "#000" : "transparent",
                    }}
                    title={c}
                  />
                ))}
              </div>
              {form.name && (
                <div className="mt-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${form.color}18`,
                      color: form.color,
                      borderRadius: 2,
                    }}
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: form.color }}
                    />
                    {form.name || "Preview"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isPending
                ? "Saving…"
                : form.mode === "create"
                  ? "Create"
                  : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              disabled={isPending}
              className="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Active statuses */}
      {active.length === 0 && !form ? (
        <div className="border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">No statuses found.</p>
        </div>
      ) : (
        active.length > 0 && (
          <div className="border border-border divide-y divide-border">
            {active.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium shrink-0"
                  style={{
                    backgroundColor: `${s.color}18`,
                    color: s.color,
                    borderRadius: 2,
                  }}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name}
                </span>

                {s.isDefault && (
                  <span className="text-[10px] font-medium text-muted-foreground border border-border px-1.5 py-0.5 flex items-center gap-1">
                    <Star className="size-2.5" />
                    Default
                  </span>
                )}

                {canManage && (
                  <div className="ml-auto flex items-center gap-1 shrink-0">
                    {!s.isDefault && (
                      <button
                        onClick={() => handleSetDefault(s)}
                        disabled={isPending}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Set as default"
                      >
                        <Star className="size-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(s)}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title="Edit"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      onClick={() => setArchiveTarget(s)}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title="Archive"
                    >
                      <Archive className="size-3.5" />
                    </button>
                    {!s.isDefault && (
                      <button
                        onClick={() => setDeleteTarget(s)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Archived statuses */}
      {archived.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Archived
          </p>
          <div className="border border-border divide-y divide-border opacity-60">
            {archived.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium shrink-0"
                  style={{
                    backgroundColor: `${s.color}18`,
                    color: s.color,
                    borderRadius: 2,
                  }}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name}
                </span>
                {canManage && (
                  <div className="ml-auto flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setArchiveTarget(s)}
                      className="p-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => setDeleteTarget(s)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Status"
        description={`Delete "${deleteTarget?.name}"? Posts with this status will keep their status slug but it won't appear in selections. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isPending={isPending}
        variant="destructive"
      />

      {/* Confirm archive/restore */}
      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={archiveTarget?.isArchived ? "Restore Status" : "Archive Status"}
        description={
          archiveTarget?.isArchived
            ? `Restore "${archiveTarget?.name}"? It will be available for post selections again.`
            : `Archive "${archiveTarget?.name}"? It will be hidden from post status selections.`
        }
        confirmLabel={archiveTarget?.isArchived ? "Restore" : "Archive"}
        onConfirm={handleArchiveToggle}
        isPending={isPending}
        variant="default"
      />
    </div>
  );
}

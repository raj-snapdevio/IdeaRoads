"use client";

import { Archive, Edit2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/actions/categories";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CategoryChip } from "./category-chip";

const COLOR_PRESETS = [
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
  "#6b7280",
  "#374151",
];

interface Category {
  color: string;
  description: string | null;
  displayOrder: number;
  id: string;
  isArchived: boolean;
  name: string;
  slug: string;
}

interface CategoryListProps {
  canManage: boolean;
  categories: Category[];
  workspaceId: string;
}

interface FormState {
  categoryId?: string;
  color: string;
  description: string;
  mode: "create" | "edit";
  name: string;
}

const DEFAULT_FORM: FormState = {
  mode: "create",
  name: "",
  description: "",
  color: "#6366f1",
};

export function CategoryList({
  categories,
  workspaceId,
  canManage,
}: CategoryListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setForm({ ...DEFAULT_FORM });
    setError(null);
  }

  function openEdit(cat: Category) {
    setForm({
      mode: "edit",
      categoryId: cat.id,
      name: cat.name,
      description: cat.description ?? "",
      color: cat.color,
    });
    setError(null);
  }

  function closeForm() {
    setForm(null);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) {
      return;
    }
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    startTransition(async () => {
      let result;
      if (form.mode === "create") {
        result = await createCategoryAction({
          workspaceId,
          name: trimmedName,
          description: form.description.trim() || undefined,
          color: form.color,
        });
      } else {
        result = await updateCategoryAction({
          categoryId: form.categoryId!,
          workspaceId,
          name: trimmedName,
          description: form.description.trim() || null,
          color: form.color,
        });
      }

      if (!result.success) {
        setError(result.error);
        return;
      }

      toast.success(
        form.mode === "create" ? "Category created" : "Category updated"
      );
      closeForm();
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget) {
      return;
    }
    startTransition(async () => {
      const result = await deleteCategoryAction({
        categoryId: deleteTarget.id,
        workspaceId,
      });
      setDeleteTarget(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Category deleted");
      router.refresh();
    });
  }

  function handleArchiveToggle() {
    if (!archiveTarget) {
      return;
    }
    startTransition(async () => {
      const result = await updateCategoryAction({
        categoryId: archiveTarget.id,
        workspaceId,
        isArchived: !archiveTarget.isArchived,
      });
      setArchiveTarget(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        archiveTarget.isArchived ? "Category restored" : "Category archived"
      );
      router.refresh();
    });
  }

  const active = categories.filter((c) => !c.isArchived);
  const archived = categories.filter((c) => c.isArchived);

  return (
    <div className="px-8 py-6 max-w-2xl space-y-6">
      {/* Add button */}
      {canManage && !form && (
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={openCreate}
        >
          <Plus className="size-3.5" />
          New Category
        </button>
      )}

      {/* Inline form */}
      {form && canManage && (
        <form
          className="border border-border p-4 space-y-4"
          onSubmit={handleSubmit}
        >
          <h3 className="text-sm font-semibold text-foreground">
            {form.mode === "create" ? "New Category" : "Edit Category"}
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                className="w-full px-3 py-2 text-sm border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={64}
                onChange={(e) =>
                  setForm((f) => f && { ...f, name: e.target.value })
                }
                placeholder="e.g. Bug, Feature Request"
                type="text"
                value={form.name}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Description{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <input
                className="w-full px-3 py-2 text-sm border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={200}
                onChange={(e) =>
                  setForm((f) => f && { ...f, description: e.target.value })
                }
                placeholder="Short description"
                type="text"
                value={form.description}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    className="size-6 rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    key={c}
                    onClick={() => setForm((f) => f && { ...f, color: c })}
                    style={{
                      backgroundColor: c,
                      borderColor: form.color === c ? "#000" : "transparent",
                    }}
                    title={c}
                    type="button"
                  />
                ))}
              </div>
              {form.name && (
                <div className="mt-2">
                  <CategoryChip
                    color={form.color}
                    name={form.name || "Preview"}
                  />
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center gap-2">
            <button
              className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isPending}
              type="submit"
            >
              {isPending
                ? "Saving…"
                : form.mode === "create"
                  ? "Create"
                  : "Save Changes"}
            </button>
            <button
              className="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isPending}
              onClick={closeForm}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Active categories */}
      {active.length === 0 && !form ? (
        <div className="border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">No categories yet.</p>
          {canManage && (
            <button
              className="mt-3 text-sm text-primary hover:underline focus-visible:outline-none"
              onClick={openCreate}
            >
              Create your first category
            </button>
          )}
        </div>
      ) : (
        active.length > 0 && (
          <div className="border border-border divide-y divide-border">
            {active.map((cat) => (
              <div className="flex items-center gap-3 px-4 py-3" key={cat.id}>
                <CategoryChip color={cat.color} name={cat.name} />
                {cat.description && (
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {cat.description}
                  </span>
                )}
                {canManage && (
                  <div className="ml-auto flex items-center gap-1 shrink-0">
                    <button
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => openEdit(cat)}
                      title="Edit"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setArchiveTarget(cat)}
                      title="Archive"
                    >
                      <Archive className="size-3.5" />
                    </button>
                    <button
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setDeleteTarget(cat)}
                      title="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Archived categories */}
      {archived.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Archived
          </p>
          <div className="border border-border divide-y divide-border opacity-60">
            {archived.map((cat) => (
              <div className="flex items-center gap-3 px-4 py-3" key={cat.id}>
                <CategoryChip color={cat.color} name={cat.name} />
                {cat.description && (
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {cat.description}
                  </span>
                )}
                {canManage && (
                  <div className="ml-auto flex items-center gap-1 shrink-0">
                    <button
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-xs"
                      onClick={() => setArchiveTarget(cat)}
                      title="Restore"
                    >
                      Restore
                    </button>
                    <button
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setDeleteTarget(cat)}
                      title="Delete"
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
        confirmLabel="Delete"
        description={`Delete "${deleteTarget?.name}"? Posts in this category will become uncategorized. This action cannot be undone.`}
        isPending={isPending}
        onConfirm={handleDelete}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        open={!!deleteTarget}
        title="Delete Category"
        variant="destructive"
      />

      {/* Confirm archive */}
      <ConfirmDialog
        confirmLabel={archiveTarget?.isArchived ? "Restore" : "Archive"}
        description={
          archiveTarget?.isArchived
            ? `Restore "${archiveTarget?.name}"? It will be available for new posts again.`
            : `Archive "${archiveTarget?.name}"? It will be hidden from new post selections.`
        }
        isPending={isPending}
        onConfirm={handleArchiveToggle}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        open={!!archiveTarget}
        title={
          archiveTarget?.isArchived ? "Restore Category" : "Archive Category"
        }
        variant="default"
      />
    </div>
  );
}

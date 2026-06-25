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
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  isArchived: boolean;
  displayOrder: number;
}

interface CategoryListProps {
  categories: Category[];
  workspaceId: string;
  canManage: boolean;
}

interface FormState {
  mode: "create" | "edit";
  categoryId?: string;
  name: string;
  description: string;
  color: string;
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
    if (!form) return;
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
    if (!deleteTarget) return;
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
    if (!archiveTarget) return;
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
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-3.5" />
          New Category
        </button>
      )}

      {/* Inline form */}
      {form && canManage && (
        <form
          onSubmit={handleSubmit}
          className="border border-border p-4 space-y-4"
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
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => f && { ...f, name: e.target.value })
                }
                placeholder="e.g. Bug, Feature Request"
                maxLength={64}
                className="w-full px-3 py-2 text-sm border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => f && { ...f, description: e.target.value })
                }
                placeholder="Short description"
                maxLength={200}
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
                  <CategoryChip
                    name={form.name || "Preview"}
                    color={form.color}
                  />
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

      {/* Active categories */}
      {active.length === 0 && !form ? (
        <div className="border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">No categories yet.</p>
          {canManage && (
            <button
              onClick={openCreate}
              className="mt-3 text-sm text-primary hover:underline focus-visible:outline-none"
            >
              Create your first category
            </button>
          )}
        </div>
      ) : (
        active.length > 0 && (
          <div className="border border-border divide-y divide-border">
            {active.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                <CategoryChip name={cat.name} color={cat.color} />
                {cat.description && (
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {cat.description}
                  </span>
                )}
                {canManage && (
                  <div className="ml-auto flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(cat)}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title="Edit"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      onClick={() => setArchiveTarget(cat)}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title="Archive"
                    >
                      <Archive className="size-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(cat)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                <CategoryChip name={cat.name} color={cat.color} />
                {cat.description && (
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {cat.description}
                  </span>
                )}
                {canManage && (
                  <div className="ml-auto flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setArchiveTarget(cat)}
                      className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-xs"
                      title="Restore"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => setDeleteTarget(cat)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Category"
        description={`Delete "${deleteTarget?.name}"? Posts in this category will become uncategorized. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isPending={isPending}
        variant="destructive"
      />

      {/* Confirm archive */}
      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={
          archiveTarget?.isArchived ? "Restore Category" : "Archive Category"
        }
        description={
          archiveTarget?.isArchived
            ? `Restore "${archiveTarget?.name}"? It will be available for new posts again.`
            : `Archive "${archiveTarget?.name}"? It will be hidden from new post selections.`
        }
        confirmLabel={archiveTarget?.isArchived ? "Restore" : "Archive"}
        onConfirm={handleArchiveToggle}
        isPending={isPending}
        variant="default"
      />
    </div>
  );
}

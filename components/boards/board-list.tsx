"use client";

import {
  Archive,
  ArrowDown,
  ArrowUp,
  Edit2,
  Globe,
  Lock,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createBoardAction,
  deleteBoardAction,
  reorderBoardsAction,
  setBoardArchivedAction,
  updateBoardAction,
} from "@/app/actions/boards";
import { MAX_BOARDS_PER_WORKSPACE } from "@/config/platform";

const MAX_ACTIVE_BOARDS = MAX_BOARDS_PER_WORKSPACE;

interface Board {
  description: string | null;
  displayOrder: number;
  id: string;
  isArchived: boolean;
  isPublic: boolean;
  name: string;
  postCount: number;
  slug: string;
}

interface BoardListProps {
  boards: Board[];
  workspaceId: string;
}

interface FormState {
  boardId?: string;
  description: string;
  isPublic: boolean;
  mode: "create" | "edit";
  name: string;
  slug: string;
  slugTouched: boolean;
}

const DEFAULT_FORM: FormState = {
  mode: "create",
  name: "",
  slug: "",
  description: "",
  isPublic: true,
  slugTouched: false,
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
}

export function BoardList({ boards, workspaceId }: BoardListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const active = boards.filter((b) => !b.isArchived);
  const archived = boards.filter((b) => b.isArchived);
  const atLimit = active.length >= MAX_ACTIVE_BOARDS;

  function openCreate() {
    setForm({ ...DEFAULT_FORM });
    setError(null);
  }

  function openEdit(board: Board) {
    setForm({
      mode: "edit",
      boardId: board.id,
      name: board.name,
      slug: board.slug,
      description: board.description ?? "",
      isPublic: board.isPublic,
      slugTouched: true,
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
    const name = form.name.trim();
    if (!name) {
      setError("Name is required.");
      return;
    }

    startTransition(async () => {
      const result =
        form.mode === "create"
          ? await createBoardAction({
              workspaceId,
              name,
              slug: form.slug.trim() || undefined,
              description: form.description.trim() || undefined,
              isPublic: form.isPublic,
            })
          : await updateBoardAction({
              boardId: form.boardId!,
              workspaceId,
              name,
              slug: form.slug.trim() || undefined,
              description: form.description.trim() || null,
              isPublic: form.isPublic,
            });

      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success(form.mode === "create" ? "Board created" : "Board updated");
      closeForm();
      router.refresh();
    });
  }

  function handleArchiveToggle(board: Board) {
    startTransition(async () => {
      const result = await setBoardArchivedAction({
        boardId: board.id,
        workspaceId,
        archived: !board.isArchived,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(board.isArchived ? "Board restored" : "Board archived");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget || deleteConfirm !== deleteTarget.name) {
      return;
    }
    const target = deleteTarget;
    startTransition(async () => {
      const result = await deleteBoardAction({
        boardId: target.id,
        workspaceId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setDeleteTarget(null);
      setDeleteConfirm("");
      toast.success("Board deleted");
      router.refresh();
    });
  }

  function handleMove(index: number, direction: -1 | 1) {
    const next = [...active];
    const target = index + direction;
    if (target < 0 || target >= next.length) {
      return;
    }
    [next[index], next[target]] = [next[target]!, next[index]!];
    startTransition(async () => {
      const result = await reorderBoardsAction({
        workspaceId,
        orderedIds: next.map((b) => b.id),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="px-8 py-6 max-w-2xl space-y-6">
      {/* Add button */}
      {!form &&
        (atLimit ? (
          <p className="text-xs text-muted-foreground">
            You've reached the limit of {MAX_ACTIVE_BOARDS} active boards.
            Archive or delete a board to add another.
          </p>
        ) : (
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={openCreate}
            type="button"
          >
            <Plus className="size-3.5" />
            New Board
          </button>
        ))}

      {/* Inline form */}
      {form && (
        <form
          className="border border-border p-4 space-y-4"
          onSubmit={handleSubmit}
        >
          <h3 className="text-sm font-semibold text-foreground">
            {form.mode === "create" ? "New Board" : "Edit Board"}
          </h3>

          <div className="space-y-3">
            <div>
              <label
                className="block text-xs font-medium text-foreground mb-1"
                htmlFor="board-name"
              >
                Name <span className="text-destructive">*</span>
              </label>
              <input
                className="w-full px-3 py-2 text-sm border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                id="board-name"
                maxLength={64}
                onChange={(e) =>
                  setForm(
                    (f) =>
                      f && {
                        ...f,
                        name: e.target.value,
                        slug: f.slugTouched ? f.slug : slugify(e.target.value),
                      }
                  )
                }
                placeholder="e.g. Feature Requests, Bugs"
                type="text"
                value={form.name}
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium text-foreground mb-1"
                htmlFor="board-slug"
              >
                Slug
              </label>
              <input
                className="w-full px-3 py-2 text-sm border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                id="board-slug"
                maxLength={64}
                onChange={(e) =>
                  setForm(
                    (f) =>
                      f && { ...f, slug: e.target.value, slugTouched: true }
                  )
                }
                placeholder="feature-requests"
                type="text"
                value={form.slug}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Used in the board URL: /b/{form.slug || "…"}
              </p>
            </div>

            <div>
              <label
                className="block text-xs font-medium text-foreground mb-1"
                htmlFor="board-description"
              >
                Description{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <input
                className="w-full px-3 py-2 text-sm border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                id="board-description"
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
              <span className="block text-xs font-medium text-foreground mb-1.5">
                Visibility
              </span>
              <div className="flex gap-2">
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border transition-colors ${
                    form.isPublic
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setForm((f) => f && { ...f, isPublic: true })}
                  type="button"
                >
                  <Globe className="size-3.5" />
                  Public
                </button>
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border transition-colors ${
                    form.isPublic
                      ? "border-border text-muted-foreground hover:text-foreground"
                      : "border-primary bg-primary/5 text-foreground"
                  }`}
                  onClick={() => setForm((f) => f && { ...f, isPublic: false })}
                  type="button"
                >
                  <Lock className="size-3.5" />
                  Private
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {form.isPublic
                  ? "Anyone can read this board; signing in is required to participate."
                  : "Only workspace members can see this board."}
              </p>
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
                  ? "Create Board"
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

      {/* Active boards */}
      {active.length === 0 && !form ? (
        <div className="border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">No active boards.</p>
        </div>
      ) : (
        active.length > 0 && (
          <div className="border border-border divide-y divide-border">
            {active.map((board, index) => (
              <div className="flex items-center gap-3 px-4 py-3" key={board.id}>
                <div className="flex flex-col">
                  <button
                    aria-label="Move up"
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 focus-visible:outline-none"
                    disabled={index === 0 || isPending}
                    onClick={() => handleMove(index, -1)}
                    type="button"
                  >
                    <ArrowUp className="size-3" />
                  </button>
                  <button
                    aria-label="Move down"
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 focus-visible:outline-none"
                    disabled={index === active.length - 1 || isPending}
                    onClick={() => handleMove(index, 1)}
                    type="button"
                  >
                    <ArrowDown className="size-3" />
                  </button>
                </div>
                {board.isPublic ? (
                  <Globe className="size-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <Lock className="size-3.5 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {board.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    /b/{board.slug} · {board.postCount}{" "}
                    {board.postCount === 1 ? "post" : "posts"}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1 shrink-0">
                  <button
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => openEdit(board)}
                    title="Edit"
                    type="button"
                  >
                    <Edit2 className="size-3.5" />
                  </button>
                  <button
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={isPending}
                    onClick={() => handleArchiveToggle(board)}
                    title="Archive"
                    type="button"
                  >
                    <Archive className="size-3.5" />
                  </button>
                  <button
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={active.length <= 1}
                    onClick={() => {
                      setDeleteTarget(board);
                      setDeleteConfirm("");
                    }}
                    title={
                      active.length <= 1
                        ? "Can't delete the only active board"
                        : "Delete"
                    }
                    type="button"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Archived boards */}
      {archived.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Archived
          </p>
          <div className="border border-border divide-y divide-border opacity-70">
            {archived.map((board) => (
              <div className="flex items-center gap-3 px-4 py-3" key={board.id}>
                <Archive className="size-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {board.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    /b/{board.slug} · {board.postCount}{" "}
                    {board.postCount === 1 ? "post" : "posts"}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1 shrink-0">
                  <button
                    className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={isPending}
                    onClick={() => handleArchiveToggle(board)}
                    title="Unarchive"
                    type="button"
                  >
                    Unarchive
                  </button>
                  <button
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      setDeleteTarget(board);
                      setDeleteConfirm("");
                    }}
                    title="Delete"
                    type="button"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirmation (type board name) */}
      {deleteTarget && (
        <div className="border border-destructive/40 bg-destructive/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Delete "{deleteTarget.name}"
          </p>
          <p className="text-xs text-muted-foreground">
            This permanently removes the board and all of its posts, votes, and
            comments. This cannot be undone. Type{" "}
            <span className="font-medium text-foreground">
              {deleteTarget.name}
            </span>{" "}
            to confirm.
          </p>
          <input
            className="w-full px-3 py-2 text-sm border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={deleteTarget.name}
            type="text"
            value={deleteConfirm}
          />
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-1.5 text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isPending || deleteConfirm !== deleteTarget.name}
              onClick={handleDelete}
              type="button"
            >
              {isPending ? "Deleting…" : "Delete Board"}
            </button>
            <button
              className="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isPending}
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirm("");
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  deleteOrbitWorkspaceAction,
  suspendWorkspaceAction,
  unsuspendWorkspaceAction,
} from "@/app/actions/orbit-workspaces";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Props {
  isSuspended: boolean;
  workspaceId: string;
  workspaceSlug: string;
}

export function WorkspaceActionsPanel({
  workspaceId,
  workspaceSlug,
  isSuspended,
}: Props) {
  const router = useRouter();
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [deleteSlugInput, setDeleteSlugInput] = useState("");

  async function handleSuspend() {
    setIsPending(true);
    const result = await suspendWorkspaceAction(workspaceId);
    setIsPending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Workspace suspended");
      setSuspendOpen(false);
      router.refresh();
    }
  }

  async function handleUnsuspend() {
    setIsPending(true);
    const result = await unsuspendWorkspaceAction(workspaceId);
    setIsPending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Workspace unsuspended");
      router.refresh();
    }
  }

  async function handleDelete() {
    if (deleteSlugInput !== workspaceSlug) {
      toast.error("Slug does not match");
      return;
    }
    setIsPending(true);
    const result = await deleteOrbitWorkspaceAction(workspaceId);
    setIsPending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Workspace deleted");
      setDeleteOpen(false);
      router.push("/orbit/workspaces");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isSuspended ? (
        <button
          className="border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-ui transition-colors hover:bg-accent disabled:opacity-50"
          disabled={isPending}
          onClick={handleUnsuspend}
          type="button"
        >
          Unsuspend
        </button>
      ) : (
        <button
          className="border border-border bg-card px-3 py-1.5 text-xs font-semibold uppercase tracking-ui transition-colors hover:bg-accent"
          onClick={() => setSuspendOpen(true)}
          type="button"
        >
          Suspend
        </button>
      )}

      <button
        className="border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-ui text-destructive transition-colors hover:bg-destructive/10"
        onClick={() => {
          setDeleteSlugInput("");
          setDeleteOpen(true);
        }}
        type="button"
      >
        Delete
      </button>

      {/* Suspend dialog */}
      <ConfirmDialog
        confirmLabel="Suspend"
        description="All members including the owner will immediately lose access. You can unsuspend at any time."
        isPending={isPending}
        onConfirm={handleSuspend}
        onOpenChange={setSuspendOpen}
        open={suspendOpen}
        title="Suspend workspace?"
        variant="destructive"
      />

      {/* Delete dialog */}
      <ConfirmDialog
        confirmLabel="Delete permanently"
        description={
          "This will permanently delete all data. Type the workspace slug to confirm."
        }
        isPending={isPending}
        onConfirm={handleDelete}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title="Delete workspace?"
        variant="destructive"
      >
        <input
          className="w-full border border-border bg-background px-3 py-2 font-mono text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(e) => setDeleteSlugInput(e.target.value)}
          placeholder={workspaceSlug}
          type="text"
          value={deleteSlugInput}
        />
      </ConfirmDialog>
    </div>
  );
}
